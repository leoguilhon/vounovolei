package br.com.vounovolei.api.controller.event.dto;

public record EventParticipantResponse(
        Long id,
        String name,
        String email,
        String avatarUrl,
        Boolean bringBall
) {}
