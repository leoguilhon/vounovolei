import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import http from "../api/http";
import EventCard from "../components/EventCard";
import Avatar from "../components/Avatar";
import "../styles/events.css";

const PAGE_SIZE = 10;

function pad2(v) {
  return String(v).padStart(2, "0");
}

// Normaliza ISO/LocalDateTime para chave comparável sem timezone
function toComparableKey(isoLike) {
  if (!isoLike) return null;

  let s = String(isoLike).trim();
  s = s.replace(/Z$/i, "");
  s = s.replace(/[+-]\d{2}:\d{2}$/, "");

  const [datePart, timePartRaw] = s.split("T");
  if (!datePart || !timePartRaw) return null;

  const [Y, M, D] = datePart.split("-");
  if (!Y || !M || !D) return null;

  const timePart = timePartRaw.split(".")[0];
  const parts = timePart.split(":");
  const hh = pad2(parts[0] ?? "00");
  const mm = pad2(parts[1] ?? "00");
  const ss = pad2(parts[2] ?? "00");

  return `${Y}-${pad2(M)}-${pad2(D)}T${hh}:${mm}:${ss}`;
}

function nowComparableKey() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function getJwtSub(token) {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const json = JSON.parse(atob(padded));
    return json?.sub ?? null;
  } catch {
    return null;
  }
}

const PAST_GRACE_HOURS = 12;

function parseLocalDateTimeToMs(isoLike) {
  if (!isoLike) return null;

  // tenta Date nativo primeiro (funciona se vier ISO com timezone ou "YYYY-MM-DDTHH:mm:ss")
  const d = new Date(isoLike);
  if (!Number.isNaN(d.getTime())) return d.getTime();

  // fallback manual para "YYYY-MM-DDTHH:mm" ou "YYYY-MM-DDTHH:mm:ss"
  const s = String(isoLike).trim().replace(/Z$/i, "").split(".")[0];
  const [datePart, timePart] = s.split("T");
  if (!datePart || !timePart) return null;

  const [Y, M, D] = datePart.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = timePart.split(":").map(Number);

  if (!Y || !M || !D) return null;
  return new Date(Y, M - 1, D, hh, mm, ss).getTime();
}

function isPastAfterHours(isoLike, hours) {
  const ms = parseLocalDateTimeToMs(isoLike);
  if (ms == null) return false;
  return Date.now() > ms + hours * 60 * 60 * 1000;
}

// datetime-local -> LocalDateTime (garante segundos)
function normalizeDateTimeLocal(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

export default function Events() {
  const { logout, user } = useAuth();

  const [events, setEvents] = useState([]);
  const [detailById, setDetailById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [me, setMe] = useState(null);
  const [page, setPage] = useState(1);

  const tokenRef = useRef(localStorage.getItem("token") || "");
  const jwtSub = useMemo(() => getJwtSub(tokenRef.current), []);
  const meUserId = useMemo(() => {
    if (user?.id != null) return Number(user.id);
    if (jwtSub != null) return Number(jwtSub);
    return null;
  }, [user?.id, jwtSub]);

  function capitalizeFirst(text) {
    const s = String(text ?? "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ===== MODAL: CRIAR EVENTO =====
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newEventDateTime, setNewEventDateTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function openCreate() {
    setCreateError("");
    setNewTitle("");
    setNewEventDateTime("");
    setNewLocation("");
    setNewDescription("");
    setIsCreateOpen(true);
  }

  function closeCreate() {
    if (createBusy) return;
    setIsCreateOpen(false);
  }

  async function reloadEvents() {
    const { data } = await http.get("/events", { params: { _ts: Date.now() } });
    const list = Array.isArray(data) ? data : data?.content ?? [];
    setEvents(list);
    setPage(1);
  }

  async function submitCreate(e) {
    e.preventDefault();
    if (createBusy) return;

    setCreateBusy(true);
    setCreateError("");

    try {
      const body = {
        title: String(newTitle ?? "").trim(),
        eventDateTime: normalizeDateTimeLocal(newEventDateTime),
        location: String(newLocation ?? "").trim(),
        description: String(newDescription ?? "").trim() || null,
      };

      await http.post("/events", body);

      await reloadEvents();
      setDetailById({}); // força recarregar participantsCount
      setIsCreateOpen(false);
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        logout();
        return;
      }

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Falha ao criar evento (HTTP ${status ?? "?"}).`;

      setCreateError(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("POST /events ERROR:", err);
    } finally {
      setCreateBusy(false);
    }
  }

  // ===== /auth/me (topbar) =====
  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        const { data } = await http.get("/auth/me", {
          params: { _ts: Date.now() },
        });
        if (!mounted) return;
        setMe(data);
      } catch (err) {
        if (!mounted) return;
        if (err?.response?.status === 401) logout();
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [logout]);

  // ===== carrega eventos =====
  useEffect(() => {
    async function loadEvents() {
      try {
        setError("");
        setLoading(true);
        await reloadEvents();
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401) {
          logout();
          return;
        }

        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Falha ao carregar eventos (HTTP ${status ?? "?"}).`;

        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        console.error("GET /events ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout]);

  // carrega /detail para pegar participantsCount
  useEffect(() => {
    if (!events.length) return;

    let cancelled = false;

    async function loadDetails() {
      const missing = events.filter((e) => detailById[e.id] === undefined);
      if (!missing.length) return;

      try {
        const results = await Promise.all(
          missing.map(async (e) => {
            try {
              const { data } = await http.get(`/events/${e.id}/detail`, {
                params: { _ts: Date.now() },
              });
              return [e.id, data];
            } catch {
              return [e.id, null];
            }
          })
        );

        if (cancelled) return;

        setDetailById((prev) => {
          const next = { ...prev };
          for (const [id, detail] of results) next[id] = detail;
          return next;
        });
      } catch {}
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [events, detailById]);

  const eventsEnriched = useMemo(() => {
    const nowKey = nowComparableKey();

    const enriched = events.map((e) => {
      const detail = detailById[e.id];

      const key = toComparableKey(e?.eventDateTime);
      const isPast = isPastAfterHours(e?.eventDateTime, PAST_GRACE_HOURS);

      const createdBy = e?.createdByUserId ?? null;
      const isOwner =
        meUserId != null && createdBy != null
          ? Number(meUserId) === Number(createdBy)
          : false;

      const participants = Array.isArray(detail?.participants)
        ? detail.participants
        : [];
      const isRegistered =
        meUserId != null &&
        participants.some((p) => Number(p.id) === Number(meUserId));

      return {
        ...e,
        participantsCount: detail?.participantsCount,
        isRegistered,
        isPast,
        isOwner,
        _key: key ?? "9999-12-31T23:59:59",
      };
    });

    // futuros primeiro (mais próximos), passados por último
    enriched.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      if (!a.isPast && !b.isPast) return a._key.localeCompare(b._key);
      return b._key.localeCompare(a._key);
    });

    return enriched;
  }, [events, detailById, meUserId]);

  const totalPages = useMemo(() => {
    const n = Math.ceil(eventsEnriched.length / PAGE_SIZE);
    return n <= 0 ? 1 : n;
  }, [eventsEnriched.length]);

  useEffect(() => {
    setPage((p) => {
      if (p < 1) return 1;
      if (p > totalPages) return totalPages;
      return p;
    });
  }, [totalPages]);

  const pagedEvents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return eventsEnriched.slice(start, start + PAGE_SIZE);
  }, [eventsEnriched, page]);

  const rawName = useMemo(() => {
    return user?.name?.trim() || me?.name?.trim() || "";
  }, [user?.name, me?.name]);

  const displayName = useMemo(() => {
    return rawName ? capitalizeFirst(rawName) : "";
  }, [rawName]);

  const avatarName = useMemo(() => (user ? user.name : me?.name) || "", [user, me]);
  const avatarEmail = useMemo(() => (user ? user.email : me?.email) || "", [user, me]);
  const avatarUrl = useMemo(() => (user ? user.avatarUrl : me?.avatarUrl) ?? null, [user, me]);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }

    function onEsc(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        if (isCreateOpen) closeCreate();
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen, isCreateOpen]);

  // ===== FAB via Portal (não some por overflow/transform/paginação) =====
  const fab = createPortal(
    <button
      type="button"
      onClick={openCreate}
      aria-label="Criar evento"
      title="Criar evento"
      className="fab"
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        width: 56,
        height: 56,
        borderRadius: 999,
        border: "1px solid rgba(255, 255, 255, 0.18)",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#fff",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
        cursor: "pointer",
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      <span className="fab-plus">+</span>
    </button>,
    document.body
  );

  // ===== Modal via Portal (pra não ser cortado também) =====
  const createModal = isCreateOpen
    ? createPortal(
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreate();
          }}
          style={{ zIndex: 10000 }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Criar evento</div>
              <button
                className="modal-close"
                onClick={closeCreate}
                aria-label="Fechar"
                disabled={createBusy}
              >
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={submitCreate}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Título</label>
                  <input
                    className="input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                    placeholder="Vôlei de Praia - Flamengo"
                  />
                </div>

                <div className="form-field">
                  <label>Data e hora</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={newEventDateTime}
                    onChange={(e) => setNewEventDateTime(e.target.value)}
                    required
                    placeholder="2026-02-03T20:00"
                  />
                </div>

                <div className="form-field">
                  <label>Local</label>
                  <input
                    className="input"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                    placeholder="Praia do Flamengo"
                  />
                </div>

                <div className="form-field">
                  <label>Descrição (opcional)</label>
                  <textarea
                    className="textarea"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={4}
                    placeholder="Encontro no Belmonte 20hrs"
                  />
                </div>
              </div>

              {createError && <div className="error-box">{createError}</div>}

              <div className="modal-actions modal-actions-bottom">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={createBusy}
                >
                  {createBusy ? "Criando..." : "Criar"}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeCreate}
                  disabled={createBusy}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="events-page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-center">
            <div className="brand">
              <img
                className="brand-logo"
                src="/images/logo-nobg.png"
                alt="Vou No Vôlei"
              />
            </div>
          </div>

          <div className="topbar-right" ref={menuRef}>
            <button
              className="profile-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar
                className="profile-avatar"
                name={avatarName}
                email={avatarEmail}
                avatarUrl={avatarUrl}
              />

              {displayName ? (
                <span className="profile-label">{displayName}</span>
              ) : null}

              <span className={`profile-caret ${menuOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {menuOpen && (
              <div className="profile-menu" role="menu">
                <Link
                  className="profile-menu-item"
                  to="/profile/edit"
                  onClick={() => setMenuOpen(false)}
                >
                  Editar perfil
                </Link>

                <button
                  className="profile-menu-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="events-main">
        {loading && <p className="events-hint">Carregando...</p>}
        {error && <p className="events-hint">{error}</p>}

        {!loading && !error && (
          <>
            <div className="events-grid">
              {pagedEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>

            {eventsEnriched.length > PAGE_SIZE && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </button>

                <div className="pagination-info">
                  Página <strong>{page}</strong> de{" "}
                  <strong>{totalPages}</strong>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ✅ Botão + fixo via Portal */}
      {fab}

      {/* ✅ Modal criar evento via Portal */}
      {createModal}
    </div>
  );
}
