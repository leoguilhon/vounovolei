package br.com.vounovolei.api.controller.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordValidateSecretRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 4, max = 100) String secretWord
) {}
