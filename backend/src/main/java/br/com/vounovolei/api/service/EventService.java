package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.event.dto.CreateEventRequest;
import br.com.vounovolei.api.controller.event.dto.EventResponse;
import br.com.vounovolei.api.controller.event.dto.UpdateEventRequest;
import br.com.vounovolei.api.domain.event.Event;
import br.com.vounovolei.api.repository.EventRepository;
import br.com.vounovolei.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final RateLimitService rateLimitService;
    private final EventWeatherService eventWeatherService;

    @Transactional
    public EventResponse create(CreateEventRequest req, Long createdByUserId, boolean isAdmin) {
        if (!isAdmin) {
            rateLimitService.checkCreateEventLimit(createdByUserId);
        }

        Event event = Event.builder()
                .title(req.title().trim())
                .eventDateTime(req.eventDateTime())
                .location(req.location().trim())
                .city(req.city().trim())
                .state(req.state().trim().toUpperCase())
                .description(req.description())
                .createdByUserId(createdByUserId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Event saved = eventRepository.save(event);
        eventWeatherService.refreshWeatherForEvent(saved);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> list() {
        return eventRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse detail(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));
        return toResponse(event);
    }

    @Transactional
    public EventResponse update(Long id, UpdateEventRequest req, Long userId, boolean isAdmin) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));

        boolean isOwner = event.getCreatedByUserId() != null && event.getCreatedByUserId().equals(userId);
        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        boolean weatherRelevantChange = isWeatherRelevantChange(event, req);

        event.setTitle(req.title().trim());
        event.setEventDateTime(req.eventDateTime());
        event.setLocation(req.location().trim());
        event.setCity(req.city().trim());
        event.setState(req.state().trim().toUpperCase());
        event.setDescription(req.description());
        event.setUpdatedAt(Instant.now());

        Event saved = eventRepository.save(event);
        if (weatherRelevantChange) {
            eventWeatherService.refreshWeatherForEvent(saved);
        }
        return toResponse(saved);
    }

    public void delete(Long id, Long userId, boolean isAdmin) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));

        boolean isOwner = event.getCreatedByUserId() != null && event.getCreatedByUserId().equals(userId);
        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        eventRepository.delete(event);
    }

    private EventResponse toResponse(Event event) {
        String createdByName = event.getCreatedByUserId() == null
                ? null
                : userRepository.findById(event.getCreatedByUserId())
                        .map(user -> user.getName())
                        .orElse(null);

        return new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getEventDateTime(),
                event.getLocation(),
                event.getCity(),
                event.getState(),
                eventWeatherService.fromStoredWeather(event),
                event.getDescription(),
                event.getCreatedByUserId(),
                createdByName
        );
    }

    private boolean isWeatherRelevantChange(Event event, UpdateEventRequest req) {
        return !normalize(event.getCity()).equals(normalize(req.city()))
                || !normalize(event.getState()).equals(normalize(req.state()).toUpperCase())
                || (event.getEventDateTime() == null
                ? req.eventDateTime() != null
                : !event.getEventDateTime().equals(req.eventDateTime()));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
