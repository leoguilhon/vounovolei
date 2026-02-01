package br.com.vounovolei.api.controller.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CreateEventRequest(
        @NotBlank @Size(min = 3, max = 120) String title,
        @NotNull LocalDateTime eventDateTime,
        @NotBlank @Size(min = 2, max = 120) String location,
        String description
) {}
