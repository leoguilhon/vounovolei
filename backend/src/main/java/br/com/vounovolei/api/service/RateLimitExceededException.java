package br.com.vounovolei.api.service;

import lombok.Getter;

@Getter
public class RateLimitExceededException extends RuntimeException {
    private final String error;

    public RateLimitExceededException(String error, String message) {
        super(message);
        this.error = error;
    }
}
