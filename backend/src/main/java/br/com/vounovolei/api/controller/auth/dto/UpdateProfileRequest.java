package br.com.vounovolei.api.controller.auth.dto;

public record UpdateProfileRequest(
        String name,
        String email
) {}
