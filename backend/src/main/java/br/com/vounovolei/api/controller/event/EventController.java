package br.com.vounovolei.api.controller.event;

import br.com.vounovolei.api.controller.event.dto.CreateEventRequest;
import br.com.vounovolei.api.controller.event.dto.EventDetailResponse;
import br.com.vounovolei.api.controller.event.dto.EventParticipantResponse;
import br.com.vounovolei.api.controller.event.dto.EventResponse;
import br.com.vounovolei.api.controller.event.dto.RegisterEventRequest;
import br.com.vounovolei.api.controller.event.dto.UpdateEventRequest;
import br.com.vounovolei.api.service.EventRegistrationService;
import br.com.vounovolei.api.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final EventRegistrationService eventRegistrationService;

    // ✅ agora qualquer usuário autenticado pode criar evento
    @PostMapping
    public ResponseEntity<EventResponse> create(@RequestBody @Valid CreateEventRequest req, Authentication auth) {
        Long userId = Long.valueOf(auth.getName()); // setado no JwtAuthFilter como subject
        return ResponseEntity.ok(eventService.create(req, userId));
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> list() {
        return ResponseEntity.ok(eventService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.detail(id));
    }

    // ✅ admin OU criador podem editar
    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid UpdateEventRequest req,
            Authentication auth
    ) {
        Long userId = Long.valueOf(auth.getName());

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));

        return ResponseEntity.ok(eventService.update(id, req, userId, isAdmin));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));

        eventService.delete(id, userId, isAdmin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<EventDetailResponse> register(
            @PathVariable Long id,
            Authentication auth,
            @RequestBody(required = false) RegisterEventRequest req
    ) {
        Long userId = Long.valueOf(auth.getName());

        Boolean bringBall = (req == null) ? false : req.bringBall();
        eventRegistrationService.register(id, userId, bringBall);

        return ResponseEntity.ok(eventRegistrationService.detailWithParticipants(id));
    }

    @DeleteMapping("/{id}/register")
    public ResponseEntity<EventDetailResponse> unregister(@PathVariable Long id, Authentication auth) {
        Long userId = Long.valueOf(auth.getName());
        eventRegistrationService.unregister(id, userId);
        return ResponseEntity.ok(eventRegistrationService.detailWithParticipants(id));
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<List<EventParticipantResponse>> participants(@PathVariable Long id) {
        return ResponseEntity.ok(eventRegistrationService.listParticipants(id));
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<EventDetailResponse> detailWithParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(eventRegistrationService.detailWithParticipants(id));
    }
}
