package br.com.vounovolei.api.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private static final int MAX_CREATIONS = 3;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();

    public void checkCreateAccountLimit(String clientKey) {
        check("ACCOUNT_CREATE", clientKey);
    }

    public void checkCreateEventLimit(Long userId) {
        check("EVENT_CREATE", String.valueOf(userId));
    }

    private void check(String scope, String actorKey) {
        String normalizedActorKey = (actorKey == null || actorKey.isBlank()) ? "unknown" : actorKey.trim();
        String key = scope + ":" + normalizedActorKey;
        Instant now = Instant.now();
        Instant threshold = now.minus(WINDOW);

        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(threshold)) {
                attempts.pollFirst();
            }

            if (attempts.size() >= MAX_CREATIONS) {
                throw new RateLimitExceededException(
                        "RATE_LIMIT_EXCEEDED",
                        "Limite de 3 criações a cada 15 minutos excedido."
                );
            }

            attempts.addLast(now);
        }
    }
}
