package br.com.vounovolei.api.controller.auth.dto;

public record MeResponse(Long id, String name, String email, String role, String avatarUrl) {}
