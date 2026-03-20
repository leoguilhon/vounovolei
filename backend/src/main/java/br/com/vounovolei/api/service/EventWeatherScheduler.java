package br.com.vounovolei.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class EventWeatherScheduler {

    private final EventWeatherService eventWeatherService;

    @Scheduled(cron = "0 0 6,18 * * *", zone = "America/Sao_Paulo")
    public void refreshUpcomingEventWeather() {
        log.info("Refreshing weather for current and future events");
        eventWeatherService.refreshWeatherForUpcomingEvents();
    }
}
