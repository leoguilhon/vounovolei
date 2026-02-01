import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../auth/AuthContext";
import "../styles/teamDraw.css";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitIntoTeams(players, teamsCount) {
  const teams = Array.from({ length: teamsCount }, () => []);
  players.forEach((p, idx) => {
    teams[idx % teamsCount].push(p);
  });
  return teams;
}

export default function TeamDraw() {
  const { id } = useParams();
  const { logout } = useAuth();

  const [event, setEvent] = useState(null);
  const [teamsCount, setTeamsCount] = useState(2);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const players = useMemo(() => event?.participants ?? [], [event]);

  useEffect(() => {
    async function load() {
      try {
        setError("");
        setLoading(true);

        const { data } = await http.get(`/events/${id}`);
        setEvent(data);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401) {
          logout();
          return;
        }

        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Falha ao carregar evento (HTTP ${status ?? "?"}).`;

        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, logout]);

  function draw() {
    const shuffled = shuffle(players);
    setTeams(splitIntoTeams(shuffled, teamsCount));
  }

  useEffect(() => {
    if (players.length > 0) draw();
    else setTeams([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, teamsCount]);

  if (loading) {
    return (
      <div className="draw-page">
        <p className="draw-hint">Carregando...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="draw-page">
        <p className="draw-hint">{error || "Evento não encontrado."}</p>
        <Link className="back-link" to="/events">← Voltar</Link>
      </div>
    );
  }

  const title = event.title ?? event.nome ?? "Evento";

  return (
    <div className="draw-page">
      <div className="draw-top">
        <Link className="back-link" to={`/events/${event.id}`}>
          ← Voltar
        </Link>
        <h1 className="draw-title">Sorteio de times</h1>
      </div>

      <div className="draw-card">
        <p className="draw-hint">{title}</p>

        <div className="draw-controls">
          <div className="control">
            <label>Nº de times</label>
            <select
              className="select"
              value={teamsCount}
              onChange={(e) => setTeamsCount(Number(e.target.value))}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>

          <button className="primary-button" onClick={draw} disabled={players.length < 2}>
            Sortear novamente
          </button>
        </div>

        {players.length < 2 ? (
          <p className="draw-hint">Inscreva mais pessoas para sortear.</p>
        ) : (
          <div className="teams-grid">
            {teams.map((t, idx) => (
              <div key={idx} className="team-card">
                <div className="team-title">Time {idx + 1}</div>
                <ul className="team-list">
                  {t.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
