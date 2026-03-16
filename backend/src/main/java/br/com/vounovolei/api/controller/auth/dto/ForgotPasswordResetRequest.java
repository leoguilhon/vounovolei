package br.com.vounovolei.api.controller.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordResetRequest(
        @NotBlank @Email String email,
        @NotBlank String resetAuthorization,
        @NotBlank @Size(min = 6, max = 100) String newPassword,
        @NotBlank @Size(min = 6, max = 100) String confirmNewPassword
) {}
