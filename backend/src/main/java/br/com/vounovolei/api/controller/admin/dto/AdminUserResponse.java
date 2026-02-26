package br.com.vounovolei.api.controller.admin.dto;

import java.time.Instant;

public record AdminUserResponse(
        Long id,
        String name,
        String email,
        String role,
        String avatarUrl,
        Instant createdAt
) {}
