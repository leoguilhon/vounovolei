package br.com.vounovolei.api.controller.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record EventDetailResponse(
        Long id,
        String title,
        LocalDateTime eventDateTime,
        String location,
        String description,
        Long participantsCount,
        List<EventParticipantResponse> participants
) {}
