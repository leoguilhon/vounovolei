package br.com.vounovolei.api.controller.admin.dto;

public record AdminUpdateUserRequest(
        String name,
        String email,
        String role,
        String password
) {}
