package br.com.vounovolei.api.controller.auth;

import br.com.vounovolei.api.controller.auth.dto.AuthResponse;
import br.com.vounovolei.api.controller.auth.dto.LoginRequest;
import br.com.vounovolei.api.controller.auth.dto.RegisterRequest;
import br.com.vounovolei.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.vounovolei.api.controller.auth.dto.MeResponse;
import br.com.vounovolei.api.controller.auth.dto.ChangePasswordRequest;
import br.com.vounovolei.api.controller.auth.dto.UpdateProfileRequest;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;



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
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest req) {
        String token = authService.register(req);
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest req) {
        String token = authService.login(req);
        return ResponseEntity.ok(new AuthResponse(token));
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
}
