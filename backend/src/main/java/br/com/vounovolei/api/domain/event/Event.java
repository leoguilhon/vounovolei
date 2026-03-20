package br.com.vounovolei.api.domain.event;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "event_date_time", nullable = false)
    private LocalDateTime eventDateTime;

    @Column(nullable = false, length = 120)
    private String location;

    @Column(length = 120)
    private String city;

    @Column(length = 2, columnDefinition = "CHAR(2)")
    private String state;

    @Column
    private String description;

    @Column(name = "weather_available")
    private Boolean weatherAvailable;

    @Column(name = "weather_forecast_date")
    private LocalDate weatherForecastDate;

    @Column(name = "weather_condition", length = 40)
    private String weatherCondition;

    @Column(name = "weather_condition_label", length = 120)
    private String weatherConditionLabel;

    @Column(name = "weather_icon", length = 40)
    private String weatherIcon;

    @Column(name = "weather_rain_probability")
    private Integer weatherRainProbability;

    @Column(name = "weather_expected_rain_mm")
    private Double weatherExpectedRainMm;

    @Column(name = "weather_last_updated_at")
    private Instant weatherLastUpdatedAt;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
