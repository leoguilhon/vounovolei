package br.com.vounovolei.api.controller.admin.dto;

import java.time.Instant;
import java.time.LocalDateTime;

public record AdminEventResponse(
        Long id,
        String title,
        LocalDateTime eventDateTime,
        String location,
        String city,
        String state,
        String description,
        Long createdByUserId,
        Instant createdAt,
        Instant updatedAt
) {}
