package br.com.vounovolei.api.controller.event.dto;

import java.time.Instant;
import java.time.LocalDate;

public record EventWeatherResponse(
        boolean available,
        LocalDate forecastDate,
        String condition,
        String conditionLabel,
        String icon,
        Integer rainProbability,
        Double expectedRainMm,
        Instant weatherLastUpdatedAt
) {}
