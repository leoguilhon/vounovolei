package br.com.vounovolei.api.controller.auth.dto;

public record AuthResponse(String token, String accessToken, String refreshToken) {

    public static AuthResponse of(String accessToken, String refreshToken) {
        return new AuthResponse(accessToken, accessToken, refreshToken);
    }
}
