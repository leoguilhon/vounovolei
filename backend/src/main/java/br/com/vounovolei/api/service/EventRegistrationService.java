package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.event.dto.EventDetailResponse;
import br.com.vounovolei.api.controller.event.dto.EventParticipantResponse;
import br.com.vounovolei.api.domain.event.Event;
import br.com.vounovolei.api.domain.event.EventRegistration;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.repository.EventRegistrationRepository;
import br.com.vounovolei.api.repository.EventRepository;
import br.com.vounovolei.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventRegistrationService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventRegistrationRepository eventRegistrationRepository;

    // ✅ idempotente: se já estiver registrado, não lança erro
    // ✅ agora recebe bringBall
    public void register(Long eventId, Long userId, Boolean bringBall) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("EVENT_NOT_FOUND");
        }

        if (eventRegistrationRepository.existsByEventIdAndUserId(eventId, userId)) {
            return;
        }

        boolean bringBallValue = Boolean.TRUE.equals(bringBall);

        EventRegistration reg = EventRegistration.builder()
                .eventId(eventId)
                .userId(userId)
                .bringBall(bringBallValue)
                .registeredAt(Instant.now())
                .build();

        eventRegistrationRepository.save(reg);
    }

    // ✅ idempotente: se não estiver registrado, não lança erro
    public void unregister(Long eventId, Long userId) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("EVENT_NOT_FOUND");
        }

        eventRegistrationRepository.findByEventIdAndUserId(eventId, userId)
                .ifPresent(eventRegistrationRepository::delete);
    }

    public List<EventParticipantResponse> listParticipants(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("EVENT_NOT_FOUND");
        }

        List<EventRegistration> regs = eventRegistrationRepository.findAllByEventId(eventId);
        List<Long> userIds = regs.stream().map(EventRegistration::getUserId).toList();

        List<User> users = userRepository.findAllById(userIds);
        Map<Long, User> usersById = users.stream().collect(Collectors.toMap(User::getId, u -> u));

        // Map userId -> bringBall
        Map<Long, Boolean> bringBallByUserId = regs.stream()
                .collect(Collectors.toMap(
                        EventRegistration::getUserId,
                        r -> Boolean.TRUE.equals(r.getBringBall()),
                        (a, b) -> a
                ));

        return regs.stream()
                .map(r -> usersById.get(r.getUserId()))
                .filter(u -> u != null)
                .map(u -> new EventParticipantResponse(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getAvatarUrl(),
                        Boolean.TRUE.equals(bringBallByUserId.get(u.getId()))
                ))
                .toList();
    }

    public EventDetailResponse detailWithParticipants(Long eventId) {
        Event e = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("EVENT_NOT_FOUND"));

        List<EventParticipantResponse> participants = listParticipants(eventId);
        long count = participants.size();

        return new EventDetailResponse(
                e.getId(),
                e.getTitle(),
                e.getEventDateTime(),
                e.getLocation(),
                e.getDescription(),
                count,
                participants
        );
    }
}
