import "../styles/event-weather.css";

function WeatherIcon({ icon }) {
  if (icon === "STORM") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M15 32c-5.52 0-10-4.48-10-10s4.48-10 10-10c1.66 0 3.23.41 4.61 1.13C22.04 8.83 26.56 6 31.75 6 39.07 6 45 11.93 45 19.25S39.07 32.5 31.75 32.5H15z"
          fill="#bfc9d8"
        />
        <path
          d="M24 24l-4 8h4l-2 8 8-11h-4l3-5z"
          fill="#f59e0b"
        />
        <path
          d="M14 37l-2 4M33 37l-2 4"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "RAINY") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M17 31c-5.52 0-10-4.48-10-10s4.48-10 10-10c1.66 0 3.23.41 4.61 1.13C24.04 7.83 28.56 5 33.75 5 41.07 5 47 10.93 47 18.25S41.07 31.5 33.75 31.5H17z"
          fill="#d8e8fb"
        />
        <path
          d="M15 38l-2.5 5M24 36l-2.5 5M33 38l-2.5 5"
          stroke="#2b6cb0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "CLOUDY") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M15 34c-5.52 0-10-4.48-10-10s4.48-10 10-10c1.66 0 3.23.41 4.61 1.13C22.04 10.83 26.56 8 31.75 8 39.07 8 45 13.93 45 21.25S39.07 34.5 31.75 34.5H15z"
          fill="#c9d2df"
        />
      </svg>
    );
  }

  if (icon === "PARTLY_CLOUDY") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="17" cy="16" r="8" fill="#ffd166" />
        <path
          d="M18 31c-5.52 0-10-4.48-10-10s4.48-10 10-10c1.66 0 3.23.41 4.61 1.13C25.04 7.83 29.56 5 34.75 5 42.07 5 48 10.93 48 18.25S42.07 31.5 34.75 31.5H18z"
          fill="#d7dde8"
          opacity="0.92"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="10" fill="#ffbe0b" />
      <path
        d="M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M10 38l5-5M33 15l5-5"
        stroke="#ff9f1c"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatRainMm(value) {
  if (value == null) return "--";
  return `${Number(value).toFixed(1)} mm`;
}

function formatRainProbability(value) {
  if (value == null) return "--";
  return `${value}%`;
}

export default function EventWeatherSummary({ weather, compact = false }) {
  if (!weather) return null;

  if (!weather.available) {
    return (
      <div className={`event-weather ${compact ? "event-weather--compact" : ""}`}>
        <div className="event-weather-icon event-weather-icon--unavailable">
          <WeatherIcon icon="CLOUDY" />
        </div>
        <div className="event-weather-copy">
          <div className="event-weather-title">Previsão indisponível</div>
          <div className="event-weather-subtitle">A API não retornou dados para este dia.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`event-weather ${compact ? "event-weather--compact" : ""}`}>
      <div className="event-weather-icon">
        <WeatherIcon icon={weather.icon} title={weather.conditionLabel} />
      </div>

      <div className="event-weather-copy">
        <div className="event-weather-title">{weather.conditionLabel}</div>
        <div className="event-weather-metrics">
          <span>Chuva: {formatRainProbability(weather.rainProbability)}</span>
          <span>Volume: {formatRainMm(weather.expectedRainMm)}</span>
        </div>
      </div>
    </div>
  );
}
