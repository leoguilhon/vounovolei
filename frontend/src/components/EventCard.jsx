import { Link } from "react-router-dom";
import "../styles/events.css";

const DEFAULT_IMG = "/images/beach-volley.jpg";

function formatDateTime(iso) {
  if (!iso) return { date: "-", time: "-" };

  const [datePart, timePart] = String(iso).split("T");
  const date = datePart ? datePart.split("-").reverse().join("/") : "-";
  const time = timePart ? timePart.slice(0, 5) : "-";
  return { date, time };
}

function getWeekdayLabel(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", { weekday: "long" });
}

function capitalize(text) {
  if (!text || text === "-") return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function EventCard({ event }) {
  const title = event.title ?? "Evento";
  const location = event.location ?? "Local a definir";
  const { date, time } = formatDateTime(event.eventDateTime);

  const weekday = capitalize(getWeekdayLabel(event.eventDateTime));

  const participantsCount = event.participantsCount ?? null;
  const inscritosLabel = participantsCount === 1 ? "inscrito" : "inscritos";

  return (
    <Link
      className={`event-card ${event.isPast ? "event-card--past" : ""}`}
      to={`/events/${event.id}`}
    >
      <div className="event-card-media">
        <img className="event-card-img" src={DEFAULT_IMG} alt="Vôlei de praia" />

        <div className="event-card-badge event-card-badge-left">{weekday}</div>

        {participantsCount !== null && (
          <div
            className={`event-card-badge ${
              participantsCount >= 8 ? "event-card-badge--ready" : ""
            }`}
            title={
              participantsCount >= 8
                ? "Evento com inscritos suficientes ✅"
                : `${participantsCount} ${inscritosLabel}`
            }
          >
            {participantsCount} {inscritosLabel}
          </div>
        )}
      </div>

      <div className="event-card-body">
        <div className="event-card-title-row">
          <div className="event-card-title">{title}</div>

          <div className="event-card-title-badges">
            {event.isOwner && (
              <span
                className="badge-pill badge-mine"
                title="Este evento foi criado por você"
              >
                Criado por você
              </span>
            )}
          </div>
        </div>

        <div className="event-card-row">
          <span className="event-card-icon">📍</span>
          <span className="event-card-text">{location}</span>
        </div>

        <div className="event-card-row event-card-row--meta">
          <div className="event-card-meta-left">
            <span className="event-card-icon">📅</span>
            <span className="event-card-text">{date}</span>
            <span className="event-card-sep">•</span>
            <span className="event-card-icon">⏰</span>
            <span className="event-card-text">{time}</span>
          </div>

          {event.isRegistered && (
            <span
              className="badge-pill badge-registered"
              title="Você está inscrito neste evento"
            >
              Inscrito
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
