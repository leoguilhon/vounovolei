package br.com.vounovolei.api.controller.auth.dto;

public record ChangeSecretWordRequest(
        String newSecretWord,
        String confirmNewSecretWord
) {}
