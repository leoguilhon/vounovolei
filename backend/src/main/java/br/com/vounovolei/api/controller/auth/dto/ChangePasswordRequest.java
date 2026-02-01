package br.com.vounovolei.api.controller.auth.dto;

public record ChangePasswordRequest(
        String currentPassword,
        String newPassword
) {}