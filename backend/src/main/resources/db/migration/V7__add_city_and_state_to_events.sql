ALTER TABLE events
  ADD COLUMN city VARCHAR(120) NULL AFTER location,
  ADD COLUMN state CHAR(2) NULL AFTER city;

CREATE INDEX idx_events_city_state
  ON events (city, state);
