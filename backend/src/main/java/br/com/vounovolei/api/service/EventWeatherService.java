package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.event.dto.EventWeatherResponse;
import br.com.vounovolei.api.domain.event.Event;
import br.com.vounovolei.api.repository.EventRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class EventWeatherService {

    static final ZoneId WEATHER_ZONE = ZoneId.of("America/Sao_Paulo");

    private static final String GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1";
    private static final String FORECAST_BASE_URL = "https://api.open-meteo.com/v1";
    private static final int MAX_FORECAST_DAYS = 16;

    private static final Map<String, String> STATE_NAMES_BY_UF = Map.ofEntries(
            Map.entry("AC", "Acre"),
            Map.entry("AL", "Alagoas"),
            Map.entry("AP", "Amapa"),
            Map.entry("AM", "Amazonas"),
            Map.entry("BA", "Bahia"),
            Map.entry("CE", "Ceara"),
            Map.entry("DF", "Distrito Federal"),
            Map.entry("ES", "Espirito Santo"),
            Map.entry("GO", "Goias"),
            Map.entry("MA", "Maranhao"),
            Map.entry("MT", "Mato Grosso"),
            Map.entry("MS", "Mato Grosso do Sul"),
            Map.entry("MG", "Minas Gerais"),
            Map.entry("PA", "Para"),
            Map.entry("PB", "Paraiba"),
            Map.entry("PR", "Parana"),
            Map.entry("PE", "Pernambuco"),
            Map.entry("PI", "Piaui"),
            Map.entry("RJ", "Rio de Janeiro"),
            Map.entry("RN", "Rio Grande do Norte"),
            Map.entry("RS", "Rio Grande do Sul"),
            Map.entry("RO", "Rondonia"),
            Map.entry("RR", "Roraima"),
            Map.entry("SC", "Santa Catarina"),
            Map.entry("SP", "Sao Paulo"),
            Map.entry("SE", "Sergipe"),
            Map.entry("TO", "Tocantins")
    );

    private final EventRepository eventRepository;

    private final RestClient geocodingClient = RestClient.builder()
            .baseUrl(GEOCODING_BASE_URL)
            .build();

    private final RestClient forecastClient = RestClient.builder()
            .baseUrl(FORECAST_BASE_URL)
            .build();

    private final Map<String, GeoLocation> geoCache = new ConcurrentHashMap<>();

    @Transactional
    public void refreshWeatherForEvent(Event event) {
        applyWeather(event, fetchWeather(event.getEventDateTime(), event.getCity(), event.getState()));
        eventRepository.save(event);
    }

    @Transactional
    public void refreshWeatherForUpcomingEvents() {
        LocalDate today = LocalDate.now(WEATHER_ZONE);
        List<Event> events = eventRepository.findByEventDateTimeGreaterThanEqualOrderByEventDateTimeAsc(today.atStartOfDay());
        if (events.isEmpty()) {
            return;
        }

        Map<WeatherLookupKey, EventWeatherResponse> weatherByKey = new HashMap<>();
        List<Event> changedEvents = new ArrayList<>();

        for (Event event : events) {
            WeatherLookupKey key = WeatherLookupKey.from(event);
            EventWeatherResponse weather = weatherByKey.computeIfAbsent(
                    key,
                    ignored -> fetchWeather(event.getEventDateTime(), event.getCity(), event.getState())
            );
            applyWeather(event, weather);
            changedEvents.add(event);
        }

        eventRepository.saveAll(changedEvents);
    }

    @Transactional(readOnly = true)
    public EventWeatherResponse fromStoredWeather(Event event) {
        if (event == null) {
            return unavailable(null);
        }
        if (event.getWeatherAvailable() == null
                && event.getWeatherForecastDate() == null
                && event.getWeatherCondition() == null
                && event.getWeatherLastUpdatedAt() == null) {
            return unavailable(event.getEventDateTime() == null ? null : event.getEventDateTime().toLocalDate());
        }

        return new EventWeatherResponse(
                Boolean.TRUE.equals(event.getWeatherAvailable()),
                event.getWeatherForecastDate(),
                defaultString(event.getWeatherCondition(), "UNAVAILABLE"),
                defaultString(event.getWeatherConditionLabel(), "Previsao indisponivel"),
                defaultString(event.getWeatherIcon(), "UNAVAILABLE"),
                event.getWeatherRainProbability(),
                event.getWeatherExpectedRainMm(),
                event.getWeatherLastUpdatedAt()
        );
    }

    private EventWeatherResponse fetchWeather(java.time.LocalDateTime eventDateTime, String city, String state) {
        if (eventDateTime == null || isBlank(city) || isBlank(state)) {
            return unavailable(eventDateTime == null ? null : eventDateTime.toLocalDate());
        }

        LocalDate eventDate = eventDateTime.toLocalDate();
        LocalDate today = LocalDate.now(WEATHER_ZONE);
        long daysAhead = ChronoUnit.DAYS.between(today, eventDate);

        if (daysAhead < 0 || daysAhead >= MAX_FORECAST_DAYS) {
            return unavailable(eventDate);
        }

        try {
            GeoLocation geoLocation = resolveGeoLocation(city, state);
            if (geoLocation == null) {
                return unavailable(eventDate);
            }
            return resolveForecast(eventDate, geoLocation);
        } catch (RuntimeException ex) {
            log.warn("Failed to refresh weather for city={} state={} date={}", city, state, eventDate, ex);
            return unavailable(eventDate);
        }
    }

    private EventWeatherResponse resolveForecast(LocalDate eventDate, GeoLocation geoLocation) {
        ForecastApiResponse response = forecastClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/forecast")
                        .queryParam("latitude", geoLocation.latitude())
                        .queryParam("longitude", geoLocation.longitude())
                        .queryParam("timezone", "auto")
                        .queryParam("daily", "weather_code,precipitation_probability_max,precipitation_sum")
                        .queryParam("start_date", eventDate)
                        .queryParam("end_date", eventDate)
                        .build())
                .retrieve()
                .body(ForecastApiResponse.class);

        if (response == null || response.daily() == null || response.daily().time() == null || response.daily().time().isEmpty()) {
            return unavailable(eventDate);
        }

        int index = response.daily().time().indexOf(eventDate.toString());
        if (index < 0) {
            index = 0;
        }

        Integer weatherCode = valueAt(response.daily().weatherCode(), index);
        Integer rainProbability = valueAt(response.daily().precipitationProbabilityMax(), index);
        Double rainMm = valueAt(response.daily().precipitationSum(), index);
        WeatherCondition weatherCondition = mapCondition(weatherCode);

        return new EventWeatherResponse(
                true,
                eventDate,
                weatherCondition.name(),
                weatherCondition.label(),
                weatherCondition.icon(),
                rainProbability,
                rainMm,
                Instant.now()
        );
    }

    private GeoLocation resolveGeoLocation(String city, String state) {
        String cacheKey = normalize(city) + "|" + normalize(state);
        GeoLocation cached = geoCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        GeocodingApiResponse response = geocodingClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("name", city)
                        .queryParam("count", 20)
                        .queryParam("language", "pt")
                        .queryParam("countryCode", "BR")
                        .build())
                .retrieve()
                .body(GeocodingApiResponse.class);

        if (response == null || response.results() == null || response.results().isEmpty()) {
            return null;
        }

        String normalizedCity = normalize(city);
        String normalizedStateName = normalize(STATE_NAMES_BY_UF.getOrDefault(state.toUpperCase(Locale.ROOT), state));

        GeocodingResult chosen = response.results().stream()
                .filter(result -> Objects.equals("BR", result.countryCode()))
                .filter(result -> normalize(result.name()).equals(normalizedCity))
                .filter(result -> normalize(result.admin1()).equals(normalizedStateName))
                .findFirst()
                .orElseGet(() -> response.results().stream()
                        .filter(result -> Objects.equals("BR", result.countryCode()))
                        .filter(result -> normalize(result.name()).equals(normalizedCity))
                        .findFirst()
                        .orElse(response.results().get(0)));

        GeoLocation geoLocation = new GeoLocation(chosen.latitude(), chosen.longitude());
        geoCache.put(cacheKey, geoLocation);
        return geoLocation;
    }

    private void applyWeather(Event event, EventWeatherResponse weather) {
        event.setWeatherAvailable(weather.available());
        event.setWeatherForecastDate(weather.forecastDate());
        event.setWeatherCondition(weather.condition());
        event.setWeatherConditionLabel(weather.conditionLabel());
        event.setWeatherIcon(weather.icon());
        event.setWeatherRainProbability(weather.rainProbability());
        event.setWeatherExpectedRainMm(weather.expectedRainMm());
        event.setWeatherLastUpdatedAt(weather.weatherLastUpdatedAt());
    }

    private EventWeatherResponse unavailable(LocalDate eventDate) {
        return new EventWeatherResponse(
                false,
                eventDate,
                "UNAVAILABLE",
                "Previsao indisponivel",
                "UNAVAILABLE",
                null,
                null,
                null
        );
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private <T> T valueAt(List<T> values, int index) {
        if (values == null || index < 0 || index >= values.size()) {
            return null;
        }
        return values.get(index);
    }

    private WeatherCondition mapCondition(Integer weatherCode) {
        int code = weatherCode == null ? -1 : weatherCode;

        if (isSeverePrecipitationCode(code)) {
            return WeatherCondition.STORM;
        }

        if (isPrecipitationCode(code)) {
            return WeatherCondition.RAINY;
        }

        if (isCloudyCode(code)) {
            return WeatherCondition.CLOUDY;
        }

        if (isPartlyCloudyCode(code)) {
            return WeatherCondition.PARTLY_CLOUDY;
        }

        if (code == 0) {
            return WeatherCondition.SUNNY;
        }

        return WeatherCondition.CLOUDY;
    }

    private boolean isSeverePrecipitationCode(int code) {
        return (code >= 65 && code <= 67)
                || code == 82
                || code == 86
                || (code >= 95 && code <= 99);
    }

    private boolean isPrecipitationCode(int code) {
        return (code >= 51 && code <= 67)
                || (code >= 71 && code <= 77)
                || (code >= 80 && code <= 82)
                || (code >= 85 && code <= 86)
                || (code >= 95 && code <= 99);
    }

    private boolean isCloudyCode(int code) {
        return code == 3 || code == 45 || code == 48;
    }

    private boolean isPartlyCloudyCode(int code) {
        return code == 1 || code == 2;
    }

    private enum WeatherCondition {
        SUNNY("Ensolarado", "SUNNY"),
        PARTLY_CLOUDY("Parcialmente nublado", "PARTLY_CLOUDY"),
        CLOUDY("Nublado", "CLOUDY"),
        STORM("Chuva forte", "STORM"),
        RAINY("Chuvoso", "RAINY");

        private final String label;
        private final String icon;

        WeatherCondition(String label, String icon) {
            this.label = label;
            this.icon = icon;
        }

        public String label() {
            return label;
        }

        public String icon() {
            return icon;
        }
    }

    private record GeoLocation(double latitude, double longitude) {}

    private record GeocodingApiResponse(List<GeocodingResult> results) {}

    private record GeocodingResult(
            String name,
            Double latitude,
            Double longitude,
            @JsonProperty("country_code") String countryCode,
            String admin1
    ) {}

    private record ForecastApiResponse(DailyForecast daily) {}

    private record DailyForecast(
            List<String> time,
            @JsonProperty("weather_code") List<Integer> weatherCode,
            @JsonProperty("precipitation_probability_max") List<Integer> precipitationProbabilityMax,
            @JsonProperty("precipitation_sum") List<Double> precipitationSum
    ) {}

    private record WeatherLookupKey(String city, String state, LocalDate eventDate) {
        static WeatherLookupKey from(Event event) {
            return new WeatherLookupKey(
                    normalizeStatic(event.getCity()),
                    normalizeStatic(event.getState()),
                    event.getEventDateTime() == null ? null : event.getEventDateTime().toLocalDate()
            );
        }

        private static String normalizeStatic(String value) {
            if (value == null) return "";
            return Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .toLowerCase(Locale.ROOT)
                    .trim();
        }
    }
}
