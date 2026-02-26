package br.com.vounovolei.api.controller.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminChangePasswordRequest(
        @NotBlank @Size(min = 6, max = 100) String newPassword
) {}
