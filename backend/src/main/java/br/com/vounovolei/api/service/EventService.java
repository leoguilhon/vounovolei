package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.event.dto.CreateEventRequest;
import br.com.vounovolei.api.controller.event.dto.EventResponse;
import br.com.vounovolei.api.controller.event.dto.UpdateEventRequest;
import br.com.vounovolei.api.domain.event.Event;
import br.com.vounovolei.api.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;

    public EventResponse create(CreateEventRequest req, Long createdByUserId) {
        Event e = Event.builder()
                .title(req.title().trim())
                .eventDateTime(req.eventDateTime())
                .location(req.location().trim())
                .description(req.description())
                .createdByUserId(createdByUserId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Event saved = eventRepository.save(e);
        return toResponse(saved);
    }

    public List<EventResponse> list() {
        return eventRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EventResponse detail(Long id) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));
        return toResponse(e);
    }

    // ✅ admin OU criador podem editar
    public EventResponse update(Long id, UpdateEventRequest req, Long userId, boolean isAdmin) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));

        boolean isOwner = e.getCreatedByUserId() != null && e.getCreatedByUserId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        e.setTitle(req.title().trim());
        e.setEventDateTime(req.eventDateTime());
        e.setLocation(req.location().trim());
        e.setDescription(req.description());
        e.setUpdatedAt(Instant.now());

        Event saved = eventRepository.save(e);
        return toResponse(saved);
    }

    // ✅ admin OU criador podem excluir
    public void delete(Long id, Long userId, boolean isAdmin) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));

        boolean isOwner = e.getCreatedByUserId() != null && e.getCreatedByUserId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        eventRepository.delete(e);
    }

    private EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getEventDateTime(),
                e.getLocation(),
                e.getDescription(),
                e.getCreatedByUserId()
        );
    }
}
