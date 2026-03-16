package br.com.vounovolei.api.domain.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "secret_word_hash", length = 255)
    private String secretWordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "secret_word_last_password_reset_at")
    private Instant secretWordLastPasswordResetAt;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "avatar_updated_at")
    private LocalDateTime avatarUpdatedAt;
}
