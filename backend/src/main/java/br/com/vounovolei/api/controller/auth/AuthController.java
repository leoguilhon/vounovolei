package br.com.vounovolei.api.controller.auth;

import br.com.vounovolei.api.controller.auth.dto.AuthResponse;
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
import br.com.vounovolei.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        return ResponseEntity.ok(authService.me());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest req, HttpServletRequest request) {
        var tokens = authService.register(req, extractClientKey(request));
        return ResponseEntity.ok(AuthResponse.of(tokens.accessToken(), tokens.refreshToken()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest req) {
        var tokens = authService.login(req);
        return ResponseEntity.ok(AuthResponse.of(tokens.accessToken(), tokens.refreshToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody @Valid RefreshTokenRequest req) {
        var tokens = authService.refresh(req);
        return ResponseEntity.ok(AuthResponse.of(tokens.accessToken(), tokens.refreshToken()));
    }

    @PostMapping("/forgot-password/validate-secret")
    public ResponseEntity<ForgotPasswordValidateSecretResponse> validateSecret(
            @RequestBody @Valid ForgotPasswordValidateSecretRequest req
    ) {
        return ResponseEntity.ok(authService.validateSecretForPasswordReset(req));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Void> resetPassword(@RequestBody @Valid ForgotPasswordResetRequest req) {
        authService.resetPasswordWithSecretWord(req);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me")
    public ResponseEntity<MeResponse> updateMe(@RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(authService.updateMe(req));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
        authService.changeMyPassword(req);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me/secret-word")
    public ResponseEntity<Void> changeSecretWord(@RequestBody ChangeSecretWordRequest req) {
        authService.changeMySecretWord(req);
        return ResponseEntity.noContent().build();
    }

    private String extractClientKey(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }
}
