package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.admin.dto.AdminEventResponse;
import br.com.vounovolei.api.controller.admin.dto.AdminUpdateEventRequest;
import br.com.vounovolei.api.controller.admin.dto.AdminUpdateUserRequest;
import br.com.vounovolei.api.controller.admin.dto.AdminUserResponse;
import br.com.vounovolei.api.domain.event.Event;
import br.com.vounovolei.api.domain.user.User;
import br.com.vounovolei.api.domain.user.UserRole;
import br.com.vounovolei.api.repository.EventRepository;
import br.com.vounovolei.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;
    private final EventWeatherService eventWeatherService;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(String q) {
        String query = normalizeQuery(q);

        if (query == null) {
            return userRepository.findAll()
                    .stream()
                    .sorted(Comparator.comparing(User::getId))
                    .map(this::toUserResponse)
                    .toList();
        }

        LinkedHashMap<Long, User> merged = new LinkedHashMap<>();
        userRepository.findByNameContainingIgnoreCaseOrderByIdAsc(query)
                .forEach(u -> merged.put(u.getId(), u));
        userRepository.findByEmailContainingIgnoreCaseOrderByIdAsc(query)
                .forEach(u -> merged.put(u.getId(), u));

        Long parsedId = tryParseId(query);
        if (parsedId != null) {
            userRepository.findById(parsedId).ifPresent(u -> merged.put(u.getId(), u));
        }

        return new ArrayList<>(merged.values())
                .stream()
                .sorted(Comparator.comparing(User::getId))
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUser(Long id) {
        return toUserResponse(findUserOrThrow(id));
    }

    @Transactional
    public AdminUserResponse updateUser(Long id, AdminUpdateUserRequest req) {
        User user = findUserOrThrow(id);

        String name = trimToNull(req.name());
        if (name == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Nome é obrigatório");
        }

        String email = trimToNull(req.email());
        if (email == null) {
            throw new ResponseStatusException(BAD_REQUEST, "E-mail é obrigatório");
        }
        email = email.toLowerCase();
        if (userRepository.existsByEmailAndIdNot(email, user.getId())) {
            throw new ResponseStatusException(CONFLICT, "E-mail já está em uso");
        }

        String roleRaw = trimToNull(req.role());
        if (roleRaw == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Role é obrigatória");
        }
        roleRaw = roleRaw.toUpperCase();
        UserRole role;
        try {
            role = UserRole.valueOf(roleRaw);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Role inválida");
        }

        user.setName(name);
        user.setEmail(email);
        user.setRole(role);

        String password = req.password() == null ? "" : req.password().trim();
        if (!password.isEmpty()) {
            user.setPassword(encodeValidatedPassword(password));
        }

        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void changeUserPassword(Long id, String newPassword) {
        User user = findUserOrThrow(id);
        user.setPassword(encodeValidatedPassword(newPassword == null ? "" : newPassword.trim()));
        userRepository.save(user);
    }

    @Transactional
    public void changeUserSecretWord(Long id, String newSecretWord) {
        User user = findUserOrThrow(id);
        user.setSecretWordHash(encodeValidatedSecretWord(newSecretWord == null ? "" : newSecretWord.trim()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = findUserOrThrow(id);

        eventRepository.deleteByCreatedByUserId(user.getId());
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public List<AdminEventResponse> listEvents(String q) {
        String query = normalizeQuery(q);

        if (query == null) {
            return eventRepository.findAll()
                    .stream()
                    .sorted(Comparator.comparing(Event::getId))
                    .map(this::toEventResponse)
                    .toList();
        }

        LinkedHashMap<Long, Event> merged = new LinkedHashMap<>();
        eventRepository.findByTitleContainingIgnoreCaseOrderByIdAsc(query)
                .forEach(e -> merged.put(e.getId(), e));

        Long parsedId = tryParseId(query);
        if (parsedId != null) {
            eventRepository.findById(parsedId).ifPresent(e -> merged.put(e.getId(), e));
        }

        return new ArrayList<>(merged.values())
                .stream()
                .sorted(Comparator.comparing(Event::getId))
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEventResponse getEvent(Long id) {
        return toEventResponse(findEventOrThrow(id));
    }

    @Transactional
    public AdminEventResponse updateEvent(Long id, AdminUpdateEventRequest req) {
        Event event = findEventOrThrow(id);

        if (!userRepository.existsById(req.createdByUserId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Usuário criador não encontrado");
        }

        boolean weatherRelevantChange = isWeatherRelevantChange(event, req);

        event.setTitle(req.title().trim());
        event.setEventDateTime(req.eventDateTime());
        event.setLocation(req.location().trim());
        event.setCity(req.city().trim());
        event.setState(req.state().trim().toUpperCase());
        event.setDescription(req.description());
        event.setCreatedByUserId(req.createdByUserId());
        event.setUpdatedAt(Instant.now());

        Event saved = eventRepository.save(event);
        if (weatherRelevantChange) {
            eventWeatherService.refreshWeatherForEvent(saved);
        }
        return toEventResponse(saved);
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = findEventOrThrow(id);
        eventRepository.delete(event);
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Usuário não encontrado"));
    }

    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Evento não encontrado"));
    }

    private AdminUserResponse toUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }

    private AdminEventResponse toEventResponse(Event event) {
        return new AdminEventResponse(
                event.getId(),
                event.getTitle(),
                event.getEventDateTime(),
                event.getLocation(),
                event.getCity(),
                event.getState(),
                event.getDescription(),
                event.getCreatedByUserId(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }

    private String normalizeQuery(String q) {
        if (q == null) return null;
        String s = q.trim();
        return s.isEmpty() ? null : s;
    }

    private Long tryParseId(String query) {
        try {
            return Long.parseLong(query);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isWeatherRelevantChange(Event event, AdminUpdateEventRequest req) {
        return !normalize(event.getCity()).equals(normalize(req.city()))
                || !normalize(event.getState()).equals(normalize(req.state()).toUpperCase())
                || (event.getEventDateTime() == null
                ? req.eventDateTime() != null
                : !event.getEventDateTime().equals(req.eventDateTime()));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String encodeValidatedPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "A nova senha é obrigatória");
        }
        if (rawPassword.length() < 6) {
            throw new ResponseStatusException(BAD_REQUEST, "A senha deve ter pelo menos 6 caracteres");
        }
        return passwordEncoder.encode(rawPassword);
    }

    private String encodeValidatedSecretWord(String rawSecretWord) {
        if (rawSecretWord == null || rawSecretWord.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "A nova palavra secreta é obrigatória");
        }
        if (rawSecretWord.length() < 4) {
            throw new ResponseStatusException(BAD_REQUEST, "A palavra secreta deve ter pelo menos 4 caracteres");
        }
        return passwordEncoder.encode(rawSecretWord);
    }
}
