CREATE TABLE event_registrations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_event_reg_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_event_reg_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT uk_event_user UNIQUE (event_id, user_id)
);
