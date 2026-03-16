package br.com.vounovolei.api.controller.auth.dto;

public record ForgotPasswordValidateSecretResponse(
        String message,
        String resetAuthorization
) {}
