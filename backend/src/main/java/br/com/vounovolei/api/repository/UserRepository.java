package br.com.vounovolei.api.repository;

import br.com.vounovolei.api.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmailAndIdNot(String email, Long id);
}
