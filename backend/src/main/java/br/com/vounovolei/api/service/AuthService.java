package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.auth.dto.ChangePasswordRequest;
import br.com.vounovolei.api.controller.auth.dto.LoginRequest;
import br.com.vounovolei.api.controller.auth.dto.MeResponse;
import br.com.vounovolei.api.controller.auth.dto.RegisterRequest;
import br.com.vounovolei.api.controller.auth.dto.UpdateProfileRequest;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.domain.user.UserRole;
import br.com.vounovolei.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public String register(RegisterRequest req) {
        if (userRepository.findByEmail(req.email().toLowerCase().trim()).isPresent()) {
            throw new IllegalArgumentException("EMAIL_ALREADY_IN_USE");
        }

        User user = User.builder()
                .name(req.name())
                .email(req.email().toLowerCase().trim())
                .password(passwordEncoder.encode(req.password()))
                .role(UserRole.USER)
                .createdAt(Instant.now())
                // ✅ default: sem foto (front mostra iniciais)
                .avatarUrl(null)
                .avatarUpdatedAt(null)
                .build();

        userRepository.save(user);
        return jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
    }

    public String login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new IllegalArgumentException("INVALID_CREDENTIALS");
        }

        return jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
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
                // ✅ adiciona avatarUrl na resposta do /me
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
                // ✅ mantém avatarUrl no updateMe também
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
        if (req.newPassword().length() < 6) {
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

}
