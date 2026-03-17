package br.com.vounovolei.api.controller.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AdminUpdateEventRequest(
        @NotBlank @Size(min = 3, max = 120) String title,
        @NotNull LocalDateTime eventDateTime,
        @NotBlank @Size(min = 2, max = 120) String location,
        @NotBlank @Size(min = 2, max = 120) String city,
        @NotBlank @Size(min = 2, max = 2) @Pattern(regexp = "[A-Za-z]{2}") String state,
        String description,
        @NotNull Long createdByUserId
) {}
