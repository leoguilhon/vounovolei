package br.com.vounovolei.api.repository;

import br.com.vounovolei.api.domain.event.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByTitleContainingIgnoreCaseOrderByIdAsc(String title);
    List<Event> findByEventDateTimeGreaterThanEqualOrderByEventDateTimeAsc(LocalDateTime eventDateTime);
    long deleteByCreatedByUserId(Long userId);
}
