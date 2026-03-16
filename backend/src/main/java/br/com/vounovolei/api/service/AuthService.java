package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.auth.dto.ChangePasswordRequest;
import br.com.vounovolei.api.controller.auth.dto.ChangeSecretWordRequest;
import br.com.vounovolei.api.controller.auth.dto.ForgotPasswordResetRequest;
import br.com.vounovolei.api.controller.auth.dto.ForgotPasswordValidateSecretRequest;
import br.com.vounovolei.api.controller.auth.dto.ForgotPasswordValidateSecretResponse;
import br.com.vounovolei.api.controller.auth.dto.LoginRequest;
import br.com.vounovolei.api.controller.auth.dto.MeResponse;
import br.com.vounovolei.api.controller.auth.dto.RefreshTokenRequest;
import br.com.vounovolei.api.controller.auth.dto.RegisterRequest;
import br.com.vounovolei.api.controller.auth.dto.UpdateProfileRequest;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.domain.user.UserRole;
import br.com.vounovolei.api.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int PASSWORD_MIN_LENGTH = 6;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RateLimitService rateLimitService;

    public AuthTokens register(RegisterRequest req, String clientKey) {
        rateLimitService.checkCreateAccountLimit(clientKey);

        String normalizedEmail = req.email().toLowerCase().trim();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("EMAIL_ALREADY_IN_USE");
        }

        validateRegisterRequest(req);

        User user = User.builder()
                .name(req.name().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(req.password()))
                .secretWordHash(passwordEncoder.encode(req.secretWord().trim()))
                .role(UserRole.USER)
                .createdAt(Instant.now())
                .secretWordLastPasswordResetAt(null)
                .avatarUrl(null)
                .avatarUpdatedAt(null)
                .build();

        userRepository.save(user);
        return issueTokens(user);
    }

    public AuthTokens login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new IllegalArgumentException("INVALID_CREDENTIALS");
        }

        return issueTokens(user);
    }

    public AuthTokens refresh(RefreshTokenRequest req) {
        Claims claims;
        try {
            claims = jwtService.parseClaims(req.refreshToken());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALIDO");
        }

        if (!jwtService.isRefreshToken(claims)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALIDO");
        }

        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALIDO");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALIDO"));

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public ForgotPasswordValidateSecretResponse validateSecretForPasswordReset(ForgotPasswordValidateSecretRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_SECRET_WORD_CREDENTIALS"));

        if (user.getSecretWordHash() == null || !passwordEncoder.matches(req.secretWord().trim(), user.getSecretWordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_SECRET_WORD_CREDENTIALS");
        }

        ensureSecretWordResetAllowed(user);

        long lastResetAt = user.getSecretWordLastPasswordResetAt() == null
                ? 0L
                : user.getSecretWordLastPasswordResetAt().toEpochMilli();

        String authorization = jwtService.generateForgotPasswordToken(user.getId(), user.getEmail(), lastResetAt);
        return new ForgotPasswordValidateSecretResponse("VALIDATION_ALLOWED", authorization);
    }

    @Transactional
    public void resetPasswordWithSecretWord(ForgotPasswordResetRequest req) {
        validateNewPassword(req.newPassword(), req.confirmNewPassword());

        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_RESET_AUTHORIZATION"));

        ensureSecretWordResetAllowed(user);

        Claims claims;
        try {
            claims = jwtService.parseClaims(req.resetAuthorization());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_RESET_AUTHORIZATION");
        }

        if (!jwtService.isForgotPasswordToken(claims)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_RESET_AUTHORIZATION");
        }

        if (!String.valueOf(user.getId()).equals(claims.getSubject())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_RESET_AUTHORIZATION");
        }

        if (!user.getEmail().equalsIgnoreCase(claims.get("email", String.class))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_RESET_AUTHORIZATION");
        }

        Number tokenLastResetAt = claims.get("lastSecretResetAt", Number.class);
        long currentLastResetAt = user.getSecretWordLastPasswordResetAt() == null
                ? 0L
                : user.getSecretWordLastPasswordResetAt().toEpochMilli();

        if (tokenLastResetAt == null || tokenLastResetAt.longValue() != currentLastResetAt) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_RESET_AUTHORIZATION");
        }

        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORD_MUST_BE_DIFFERENT");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        user.setSecretWordLastPasswordResetAt(Instant.now());
    }

    private AuthTokens issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        return new AuthTokens(accessToken, refreshToken);
    }

    private User getLoggedUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Long userId;
        try {
            userId = Long.valueOf(auth.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado"));
    }

    @Transactional(readOnly = true)
    public MeResponse me() {
        var user = getLoggedUser();
        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getAvatarUrl()
        );
    }

    @Transactional
    public MeResponse updateMe(UpdateProfileRequest req) {
        var user = getLoggedUser();

        if (req.name() != null && !req.name().isBlank()) {
            user.setName(req.name().trim());
        }

        if (req.email() != null && !req.email().isBlank()) {
            var email = req.email().trim().toLowerCase();

            if (userRepository.existsByEmailAndIdNot(email, user.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já está em uso");
            }

            user.setEmail(email);
        }

        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getAvatarUrl()
        );
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest req) {
        if (req.currentPassword() == null || req.currentPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual é obrigatória");
        }
        if (req.newPassword() == null || req.newPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nova senha é obrigatória");
        }
        if (req.newPassword().length() < PASSWORD_MIN_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ter pelo menos 6 caracteres");
        }

        var user = getLoggedUser();

        var matches = passwordEncoder.matches(req.currentPassword(), user.getPassword());
        if (!matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Senha atual incorreta");
        }

        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ser diferente da atual");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
    }

    @Transactional
    public void changeMySecretWord(ChangeSecretWordRequest req) {
        if (req.newSecretWord() == null || req.newSecretWord().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nova palavra secreta é obrigatória");
        }
        if (req.confirmNewSecretWord() == null || req.confirmNewSecretWord().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmação da palavra secreta é obrigatória");
        }
        if (req.newSecretWord().trim().length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A palavra secreta deve ter pelo menos 4 caracteres");
        }
        if (!req.newSecretWord().trim().equals(req.confirmNewSecretWord().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A confirmação da palavra secreta não confere");
        }

        var user = getLoggedUser();

        if (user.getSecretWordHash() != null && passwordEncoder.matches(req.newSecretWord().trim(), user.getSecretWordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova palavra secreta deve ser diferente da atual");
        }

        user.setSecretWordHash(passwordEncoder.encode(req.newSecretWord().trim()));
    }

    private void validateRegisterRequest(RegisterRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw new IllegalArgumentException("PASSWORD_CONFIRMATION_MISMATCH");
        }
        if (!req.secretWord().trim().equals(req.confirmSecretWord().trim())) {
            throw new IllegalArgumentException("SECRET_WORD_CONFIRMATION_MISMATCH");
        }
    }

    private void validateNewPassword(String newPassword, String confirmNewPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NEW_PASSWORD_REQUIRED");
        }
        if (confirmNewPassword == null || confirmNewPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NEW_PASSWORD_CONFIRMATION_REQUIRED");
        }
        if (newPassword.length() < PASSWORD_MIN_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_SHORT");
        }
        if (!newPassword.equals(confirmNewPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORD_CONFIRMATION_MISMATCH");
        }
    }

    private void ensureSecretWordResetAllowed(User user) {
        Instant lastResetAt = user.getSecretWordLastPasswordResetAt();
        if (lastResetAt == null) {
            return;
        }

        Instant nextAllowedAt = lastResetAt.plus(24, ChronoUnit.HOURS);
        if (nextAllowedAt.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "FORGOT_PASSWORD_RESET_NOT_AVAILABLE_YET");
        }
    }
}
