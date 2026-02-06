package br.com.vounovolei.api.controller.auth;

import br.com.vounovolei.api.controller.auth.dto.AvatarResponse;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.repository.UserRepository;
import br.com.vounovolei.api.service.AvatarService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth/me")
@RequiredArgsConstructor
public class AvatarController {

    private final AvatarService avatarService;
    private final UserRepository userRepository;

    @PutMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AvatarResponse> upload(@RequestParam("file") @NotNull MultipartFile file) {
        User user = getLoggedUserById();
        String url = avatarService.uploadAvatar(user, file);
        return ResponseEntity.ok(new AvatarResponse(url));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> delete() {
        User user = getLoggedUserById();
        avatarService.deleteAvatar(user);
        return ResponseEntity.noContent().build();
    }

    private User getLoggedUserById() {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        Long userId;
        try {
            userId = Long.valueOf(auth.getName()); // ✅ aqui é ID (porque o JwtAuthFilter setou userId)
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado"));
    }
}
