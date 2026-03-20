ALTER TABLE events
  ADD COLUMN weather_available BIT NULL AFTER description,
  ADD COLUMN weather_forecast_date DATE NULL AFTER weather_available,
  ADD COLUMN weather_condition VARCHAR(40) NULL AFTER weather_forecast_date,
  ADD COLUMN weather_condition_label VARCHAR(120) NULL AFTER weather_condition,
  ADD COLUMN weather_icon VARCHAR(40) NULL AFTER weather_condition_label,
  ADD COLUMN weather_rain_probability INT NULL AFTER weather_icon,
  ADD COLUMN weather_expected_rain_mm DOUBLE NULL AFTER weather_rain_probability,
  ADD COLUMN weather_last_updated_at TIMESTAMP NULL AFTER weather_expected_rain_mm;

CREATE INDEX idx_events_event_date_time
  ON events (event_date_time);
