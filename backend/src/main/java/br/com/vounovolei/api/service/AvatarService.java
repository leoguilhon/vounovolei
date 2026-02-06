package br.com.vounovolei.api.service;

import br.com.vounovolei.api.config.UploadProperties;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Set;

@Service
public class AvatarService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final UploadProperties props;
    private final UserRepository userRepository;

    public AvatarService(UploadProperties props, UserRepository userRepository) {
        this.props = props;
        this.userRepository = userRepository;
    }

    @Transactional
    public String uploadAvatar(User user, MultipartFile file) {
        validate(file);

        String ext = extensionFor(file.getContentType()); // .png/.jpg/.webp

        Path avatarsBaseDir = Path.of(props.getAvatarsDir()).toAbsolutePath().normalize();
        Path userDir = avatarsBaseDir.resolve(String.valueOf(user.getId())).normalize();

        // segurança: userDir precisa ficar dentro de avatarsBaseDir
        if (!userDir.startsWith(avatarsBaseDir)) {
            throw new InvalidFileException("Caminho de diretório inválido.");
        }

        // antes de salvar, remove qualquer avatar antigo na pasta do usuário
        deleteUserAvatarFiles(userDir);

        // alvo: uploads/avatars/{userId}/avatar{ext}
        String filename = "avatar" + ext;
        Path target = userDir.resolve(filename).normalize();

        if (!target.startsWith(userDir)) {
            throw new InvalidFileException("Caminho de arquivo inválido.");
        }

        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(userDir);
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao salvar avatar.", e);
        }

        // URL pública: /media/avatars/{userId}/avatar.png (ou .jpg/.webp)
        String publicUrl = "/media/avatars/" + user.getId() + "/" + filename;

        user.setAvatarUrl(publicUrl);
        user.setAvatarUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return publicUrl;
    }

    @Transactional
    public void deleteAvatar(User user) {
        Path avatarsBaseDir = Path.of(props.getAvatarsDir()).toAbsolutePath().normalize();
        Path userDir = avatarsBaseDir.resolve(String.valueOf(user.getId())).normalize();

        if (userDir.startsWith(avatarsBaseDir)) {
            deleteUserAvatarFiles(userDir);
            deleteDirIfEmpty(userDir);
        }

        user.setAvatarUrl(null);
        user.setAvatarUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Arquivo obrigatório.");
        }
        if (file.getSize() > props.getMaxAvatarBytes()) {
            throw new FileTooLargeException("Arquivo excede o limite de 2MB.");
        }
        String type = file.getContentType();
        if (type == null || !ALLOWED_TYPES.contains(type)) {
            throw new InvalidFileException("Tipo de arquivo não permitido. Use JPG, PNG ou WebP.");
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".bin";
        };
    }

    /**
     * Remove qualquer arquivo "avatar.*" dentro da pasta do usuário.
     * Mantém a regra simples: 1 avatar por usuário.
     */
    private void deleteUserAvatarFiles(Path userDir) {
        try {
            if (!Files.exists(userDir) || !Files.isDirectory(userDir)) return;

            try (DirectoryStream<Path> stream = Files.newDirectoryStream(userDir, "avatar.*")) {
                for (Path p : stream) {
                    try {
                        Files.deleteIfExists(p);
                    } catch (Exception ignored) {
                        // não quebra o fluxo
                    }
                }
            }
        } catch (Exception ignored) {
            // não quebra o fluxo
        }
    }

    private void deleteDirIfEmpty(Path dir) {
        try {
            if (!Files.exists(dir) || !Files.isDirectory(dir)) return;

            try (var stream = Files.list(dir)) {
                if (stream.findAny().isEmpty()) {
                    Files.deleteIfExists(dir);
                }
            }
        } catch (Exception ignored) {
            // não quebra o fluxo
        }
    }
}
