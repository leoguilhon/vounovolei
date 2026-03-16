package br.com.vounovolei.api.controller.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminChangeSecretWordRequest(
        @NotBlank @Size(min = 4, max = 100) String newSecretWord
) {}
