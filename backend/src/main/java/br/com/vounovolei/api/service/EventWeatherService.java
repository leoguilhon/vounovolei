package br.com.vounovolei.api.service;

import br.com.vounovolei.api.controller.event.dto.EventWeatherResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EventWeatherService {

    private static final String GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1";
    private static final String FORECAST_BASE_URL = "https://api.open-meteo.com/v1";
    private static final long FORECAST_TTL_MINUTES = 30;
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

    private final RestClient geocodingClient = RestClient.builder()
            .baseUrl(GEOCODING_BASE_URL)
            .build();

    private final RestClient forecastClient = RestClient.builder()
            .baseUrl(FORECAST_BASE_URL)
            .build();

    private final Map<String, GeoLocation> geoCache = new ConcurrentHashMap<>();
    private final Map<String, CachedForecast> forecastCache = new ConcurrentHashMap<>();

    public EventWeatherResponse resolve(LocalDateTime eventDateTime, String city, String state) {
        if (eventDateTime == null || isBlank(city) || isBlank(state)) {
            return unavailable(eventDateTime == null ? null : eventDateTime.toLocalDate());
        }

        LocalDate eventDate = eventDateTime.toLocalDate();
        LocalDate today = LocalDate.now();
        long daysAhead = ChronoUnit.DAYS.between(today, eventDate);

        if (daysAhead < 0 || daysAhead >= MAX_FORECAST_DAYS) {
            return unavailable(eventDate);
        }

        try {
            GeoLocation geoLocation = resolveGeoLocation(city, state);
            if (geoLocation == null) {
                return unavailable(eventDate);
            }
            return resolveForecast(eventDate, geoLocation, city, state);
        } catch (RuntimeException ex) {
            return unavailable(eventDate);
        }
    }

    private EventWeatherResponse resolveForecast(LocalDate eventDate, GeoLocation geoLocation, String city, String state) {
        String cacheKey = normalize(city) + "|" + normalize(state) + "|" + eventDate;
        CachedForecast cached = forecastCache.get(cacheKey);
        if (cached != null && cached.isFresh()) {
            return cached.response();
        }

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
        WeatherCondition weatherCondition = mapCondition(weatherCode, rainProbability, rainMm);

        EventWeatherResponse weather = new EventWeatherResponse(
                true,
                eventDate,
                weatherCondition.name(),
                weatherCondition.label(),
                weatherCondition.icon(),
                rainProbability,
                rainMm,
                Instant.now()
        );

        forecastCache.put(cacheKey, new CachedForecast(weather, Instant.now()));
        return weather;
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

    private EventWeatherResponse unavailable(LocalDate eventDate) {
        return new EventWeatherResponse(
                false,
                eventDate,
                "UNAVAILABLE",
                "Previsão indisponível",
                "UNAVAILABLE",
                null,
                null,
                null
        );
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

    private WeatherCondition mapCondition(Integer weatherCode, Integer rainProbability, Double rainMm) {
        int code = weatherCode == null ? -1 : weatherCode;
        double rainValue = rainMm == null ? 0.0d : rainMm;
        int probability = rainProbability == null ? 0 : rainProbability;

        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)
                || rainValue >= 1.0d || probability >= 40) {
            return WeatherCondition.RAINY;
        }

        if (code == 0) {
            return WeatherCondition.SUNNY;
        }

        if (code >= 1 && code <= 3) {
            return WeatherCondition.CLOUDY;
        }

        return probability >= 20 ? WeatherCondition.CLOUDY : WeatherCondition.SUNNY;
    }

    private enum WeatherCondition {
        SUNNY("Ensolarado", "SUNNY"),
        CLOUDY("Nublado", "CLOUDY"),
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

    private record CachedForecast(EventWeatherResponse response, Instant fetchedAt) {
        boolean isFresh() {
            return fetchedAt.plus(FORECAST_TTL_MINUTES, ChronoUnit.MINUTES).isAfter(Instant.now());
        }
    }

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
}
