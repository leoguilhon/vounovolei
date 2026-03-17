package br.com.vounovolei.api.controller.event.dto;

import java.time.LocalDateTime;

public record EventResponse(
        Long id,
        String title,
        LocalDateTime eventDateTime,
        String location,
        String city,
        String state,
        EventWeatherResponse weather,
        String description,
        Long createdByUserId,
        String createdByName
) {}
