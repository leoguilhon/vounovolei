package br.com.vounovolei.api.repository;

import br.com.vounovolei.api.domain.event.Event;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {
}
