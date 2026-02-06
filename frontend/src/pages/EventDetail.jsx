import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import "../styles/topbar.css";
import "../styles/eventDetail.css";

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
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
  players.forEach((p, idx) => teams[idx % teamsCount].push(p));
  return teams;
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

function drawStorageKey(eventId) {
  return `eventup:draw:${eventId}`;
}

// datetime-local -> LocalDateTime (garante segundos)
function normalizeDateTimeLocal(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

// ISO/LocalDateTime -> valor compatível com input datetime-local ("YYYY-MM-DDTHH:mm")
function toDatetimeLocalValue(isoLike) {
  if (!isoLike) return "";
  let s = String(isoLike).trim();

  // remove timezone e ms (se existirem)
  s = s.replace(/Z$/i, "");
  s = s.replace(/[+-]\d{2}:?\d{2}$/, "");
  s = s.split(".")[0];

  if (!s.includes("T")) return "";
  return s.slice(0, 16);
}

// tenta identificar admin em vários formatos comuns
function isAdminUser(u) {
  if (!u) return false;

  if (String(u.role ?? "").toUpperCase() === "ADMIN") return true;

  if (Array.isArray(u.roles)) {
    const set = new Set(u.roles.map((r) => String(r).toUpperCase()));
    if (set.has("ADMIN") || set.has("ROLE_ADMIN")) return true;
  }

  if (Array.isArray(u.authorities)) {
    const set = new Set(
      u.authorities
        .map((a) => a?.authority)
        .filter(Boolean)
        .map((x) => String(x).toUpperCase())
    );
    if (set.has("ADMIN") || set.has("ROLE_ADMIN")) return true;
  }

  return false;
}

// tenta extrair id do criador em diferentes nomes
function getCreatorId(evt) {
  if (!evt) return null;

  const direct =
    evt.createdByUserId ??
    evt.createdById ??
    evt.creatorId ??
    evt.ownerId ??
    null;

  if (direct != null) return Number(direct);

  const objId =
    evt.createdBy?.id ??
    evt.creator?.id ??
    evt.owner?.id ??
    null;

  return objId != null ? Number(objId) : null;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [eventBase, setEventBase] = useState(null); // /events/{id} (pra saber criador)
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ===== TOPBAR =====
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const [me, setMe] = useState(null);

  function capitalizeFirst(text) {
    const s = String(text ?? "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadMeTopbar() {
      try {
        const { data } = await http.get("/auth/me");
        if (!mounted) return;
        setMe(data);
      } catch (err) {
        if (!mounted) return;
        if (err?.response?.status === 401) logout();
      }
    }

    loadMeTopbar();

    return () => {
      mounted = false;
    };
  }, [logout]);

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
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    function onDocClick(e) {
      if (!actionsOpen) return;
      if (!actionsRef.current) return;
      if (!actionsRef.current.contains(e.target)) setActionsOpen(false);
    }

    function onEsc(e) {
      if (e.key === "Escape") setActionsOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [actionsOpen]);

  // ===== Modal sorteio =====
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const [drawMode, setDrawMode] = useState("all"); // "all" | "edit"
  const [teamsCount, setTeamsCount] = useState(2);
  const [selectedIds, setSelectedIds] = useState({});
  const [teams, setTeams] = useState([]);

  const tokenRef = useRef(localStorage.getItem("token") || "");
  const jwtSub = useMemo(() => getJwtSub(tokenRef.current), []);
  const meUserId = useMemo(() => {
    if (user?.id != null) return Number(user.id);
    if (jwtSub != null) return Number(jwtSub);
    return null;
  }, [user?.id, jwtSub]);

  function saveDrawState(next) {
    try {
      localStorage.setItem(drawStorageKey(id), JSON.stringify(next));
    } catch {}
  }

  function readDrawState() {
    try {
      const raw = localStorage.getItem(drawStorageKey(id));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function loadEvent() {
    try {
      setError("");
      setLoading(true);

      const [detailRes, baseRes] = await Promise.all([
        http.get(`/events/${id}/detail`),
        http.get(`/events/${id}`),
      ]);

      setEvent(detailRes.data);
      setEventBase(baseRes.data);
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
      setEvent(null);
      setEventBase(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const title = event?.title ?? "Evento";
  const location = event?.location ?? "Local a definir";
  const description = event?.description ?? "";
  const { date, time } = formatDateTime(event?.eventDateTime);

  const weekday = useMemo(() => {
    const label = getWeekdayLabel(event?.eventDateTime);
    return label && label !== "-" ? capitalize(label) : "-";
  }, [event?.eventDateTime]);

  const participants = useMemo(() => event?.participants ?? [], [event]);

  const participantsCount = useMemo(() => {
    const c = event?.participantsCount;
    return typeof c === "number" ? c : participants.length;
  }, [event, participants.length]);

  const inscritosLabel = participantsCount === 1 ? "inscrito" : "inscritos";

  const myParticipant = useMemo(() => {
    if (meUserId == null) return null;
    return participants.find((p) => Number(p.id) === Number(meUserId));
  }, [participants, meUserId]);

  const isRegistered = !!myParticipant;

  // ===== ✅ MODAL "COM BOLA OU SEM BOLA" =====
  const [isBallOpen, setIsBallOpen] = useState(false);
  const [ballBusy, setBallBusy] = useState(false);
  const [ballError, setBallError] = useState("");

  function openBallModal() {
    setBallError("");
    setIsBallOpen(true);
  }

  function closeBallModal() {
    if (ballBusy) return;
    setIsBallOpen(false);
  }

  async function submitRegistration(bringBall) {
    if (ballBusy) return;

    setBallBusy(true);
    setBallError("");
    setBusy(true);
    setError("");

    try {
      const { data } = await http.post(`/events/${id}/register`, {
        bringBall: !!bringBall,
      });

      if (data) setEvent(data);
      else await loadEvent();

      setIsBallOpen(false);
    } catch (err) {
      if (!err?.response) {
        const msg = err?.message || "Erro de rede (sem resposta do servidor).";
        setBallError(msg);
        console.error("AXIOS NETWORK ERROR:", err);
        return;
      }

      const status = err.response.status;

      if (status === 401) {
        logout();
        return;
      }

      const msg =
        err.response.data?.message ||
        err.response.data?.error ||
        `Falha ao se inscrever (HTTP ${status}).`;

      setBallError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBallBusy(false);
      setBusy(false);
    }
  }

  async function toggleRegistration() {
    setBusy(true);
    setError("");

    try {
      if (!isRegistered) {
        // ✅ ao invés de registrar direto, abre o modal com bola/sem bola
        setBusy(false);
        openBallModal();
        return;
      }

      const { data } = await http.delete(`/events/${id}/register`);
      if (data) setEvent(data);
      else await loadEvent();
    } catch (err) {
      if (!err?.response) {
        setError(err?.message || "Erro de rede (sem resposta do servidor).");
        console.error("AXIOS NETWORK ERROR:", err);
        return;
      }

      const status = err.response.status;

      if (status === 401) {
        logout();
        return;
      }

      const msg =
        err.response.data?.message ||
        err.response.data?.error ||
        `Falha ao atualizar inscrição (HTTP ${status}).`;

      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBusy(false);
    }
  }

  // ===== PERMISSÃO DE EDIÇÃO (admin OU criador) =====
  const isAdmin = useMemo(() => {
    return isAdminUser(user) || isAdminUser(me);
  }, [user, me]);

  const creatorId = useMemo(() => {
    return getCreatorId(eventBase);
  }, [eventBase]);

  const isOwner = useMemo(() => {
    if (meUserId == null) return false;
    if (creatorId == null) return false;
    return Number(meUserId) === Number(creatorId);
  }, [meUserId, creatorId]);

  const canEdit = isAdmin || isOwner;

  // ===== Modal EDITAR EVENTO =====
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editEventDateTime, setEditEventDateTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");

  function openEdit() {
    setEditError("");
    setEditTitle(event?.title ?? "");
    setEditEventDateTime(toDatetimeLocalValue(event?.eventDateTime));
    setEditLocation(event?.location ?? "");
    setEditDescription(event?.description ?? "");
    setIsEditOpen(true);
  }

  function closeEdit() {
    if (editBusy) return;
    setIsEditOpen(false);
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (editBusy) return;

    setEditBusy(true);
    setEditError("");

    try {
      const body = {
        title: String(editTitle ?? "").trim(),
        eventDateTime: normalizeDateTimeLocal(editEventDateTime),
        location: String(editLocation ?? "").trim(),
        description: String(editDescription ?? "").trim() || null,
      };

      await http.put(`/events/${id}`, body);

      setIsEditOpen(false);
      await loadEvent();
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        logout();
        return;
      }

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Falha ao editar evento (HTTP ${status ?? "?"}).`;

      setEditError(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("PUT /events/{id} ERROR:", err);
    } finally {
      setEditBusy(false);
    }
  }

// ===== Modal EXCLUIR EVENTO =====
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [deleteBusy, setDeleteBusy] = useState(false);
const [deleteError, setDeleteError] = useState("");

function openDelete() {
  setDeleteError("");
  setIsDeleteOpen(true);
}

function closeDelete() {
  if (deleteBusy) return;
  setIsDeleteOpen(false);
}

async function confirmDelete() {
  if (deleteBusy) return;

  setDeleteBusy(true);
  setDeleteError("");

  try {
    await http.delete(`/events/${id}`);

    // fecha modal e volta pra lista
    setIsDeleteOpen(false);
    navigate("/events", { replace: true });
  } catch (err) {
    const status = err?.response?.status;

    if (status === 401) {
      logout();
      return;
    }

    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      `Falha ao excluir evento (HTTP ${status ?? "?"}).`;

    setDeleteError(typeof msg === "string" ? msg : JSON.stringify(msg));
    console.error("DELETE /events/{id} ERROR:", err);
  } finally {
    setDeleteBusy(false);
  }
}

  // ===== Modal de sorteio =====
  function openDraw() {
    const restored = readDrawState();

    const initialSelected = {};
    for (const p of participants) initialSelected[p.id] = true;

    if (restored) {
      const restoredSelected =
        restored?.selectedIds && typeof restored.selectedIds === "object"
          ? restored.selectedIds
          : initialSelected;

      const sanitizedSelected = {};
      for (const p of participants) {
        sanitizedSelected[p.id] = !!restoredSelected[p.id];
      }

      const restoredMode = restored?.drawMode === "edit" ? "edit" : "all";
      const restoredTeamsCount =
        restored?.teamsCount === 3 || restored?.teamsCount === 4
          ? restored.teamsCount
          : 2;

      setSelectedIds(sanitizedSelected);
      setDrawMode(restoredMode);
      setTeamsCount(restoredTeamsCount);
      setTeams(Array.isArray(restored?.teams) ? restored.teams : []);
      setIsDrawOpen(true);
      return;
    }

    setSelectedIds(initialSelected);
    setDrawMode("all");
    setTeamsCount(2);
    setTeams([]);
    setIsDrawOpen(true);
  }

  function closeDraw() {
    setIsDrawOpen(false);
  }

  function selectedParticipants() {
    if (drawMode === "all") return participants;
    return participants.filter((p) => !!selectedIds[p.id]);
  }

  function doDraw() {
    const list = selectedParticipants();
    const names = list.map((p) => p.name).filter(Boolean);

    if (names.length < 2) {
      setTeams([]);
      return;
    }

    const shuffled = shuffle(names);
    setTeams(splitIntoTeams(shuffled, teamsCount));
  }

  useEffect(() => {
    if (!isDrawOpen) return;
    const next = { drawMode, teamsCount, selectedIds, teams };
    saveDrawState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawOpen, drawMode, teamsCount, selectedIds, teams]);

  useEffect(() => {
    if (!isDrawOpen) return;
    if (!teams || teams.length === 0) doDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawOpen]);

  // ===== render =====
  if (loading) {
    return (
      <div className="detail-page">
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

        <div className="detail-card">
          <div className="detail-hero">
            <div className="detail-hero-img skeleton" />
            <div className="detail-hero-badge skeleton skeleton-badge" />
          </div>

          <div className="detail-content">
            <div className="skeleton skeleton-title" />

            <div className="detail-meta">
              <span className="pill skeleton skeleton-pill" />
              <span className="pill skeleton skeleton-pill" />
              <span className="pill skeleton skeleton-pill wide" />
            </div>

            <div className="detail-section">
              <div className="skeleton skeleton-subtitle" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
            </div>

            <div className="detail-actions-row">
              <div className="detail-actions-left">
                <div className="skeleton skeleton-back" />
              </div>

              <div className="detail-actions">
                <div className="skeleton skeleton-btn" />
                <div className="skeleton skeleton-btn" />
              </div>
            </div>

            <div className="detail-section">
              <div className="skeleton skeleton-subtitle" />
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="detail-page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
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

        <p className="detail-hint">{error || "Evento não encontrado."}</p>
        <div className="detail-top">
          <Link className="back-link" to="/events">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
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

      <div className="detail-card">
        <div className="detail-hero">
          <img
            className="detail-hero-img"
            src={DEFAULT_IMG}
            alt="Vôlei de praia"
          />

          <div className="detail-hero-badge detail-hero-badge-left">
            {weekday}
          </div>

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

        <div className="detail-content">
          {/* ✅ Título + badge "Criado por você" */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1 className="detail-title" style={{ margin: 0 }}>
              {title}
            </h1>

            {isOwner && (
              <span
                className="pill badge-mine badge-mine-title"
                title="Este evento foi criado por você"
              >
                Criado por você
              </span>
            )}
          </div>

          <div className="detail-meta-row">
            <div className="detail-meta">
              <span className="pill">{date}</span>
              <span className="pill">{time}</span>
              <span className="pill pill-sand">{location}</span>
            </div>

            <div className="detail-meta-badges">
              {isRegistered && (
                <span
                  className="pill badge-registered"
                  title="Você está inscrito neste evento"
                >
                  Inscrito
                </span>
              )}
            </div>
          </div>

          {description && (
            <div className="detail-section">
              <h2>Descrição</h2>
              <p className="detail-text">{description}</p>
            </div>
          )}

          <div className="detail-actions-row">
            <div className="detail-actions-left">
              <Link className="back-link" to="/events">
                Voltar
              </Link>
            </div>

            <div className="detail-actions" ref={actionsRef}>
            <button
              className="actions-trigger"
              onClick={() => setActionsOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              title="Ações do evento"
            >
              <span className="actions-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.4 7.4 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.66 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.04.71 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.12-.54 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
                </svg>
              </span>
              <span className="actions-label">Ações</span>
            </button>

            {actionsOpen && (
              <div className="actions-dropdown" role="menu">
                <button
                  className={`actions-item ${
                    isRegistered ? "danger" : "success"
                  }`}
                  onClick={() => {
                    setActionsOpen(false);
                    toggleRegistration();
                  }}
                  disabled={busy}
                  role="menuitem"
                >
                  {busy
                    ? "..."
                    : isRegistered
                    ? "Remover inscrição"
                    : "Inscrever-se"}
                </button>

                <button
                  className="actions-item"
                  onClick={() => {
                    setActionsOpen(false);
                    openDraw();
                  }}
                  disabled={participants.length < 2}
                  title={
                    participants.length < 2
                      ? "Inscreva pelo menos 2 pessoas"
                      : "Sortear times"
                  }
                  role="menuitem"
                >
                  Sortear times
                </button>

                {canEdit && (
                  <button
                    className="actions-item"
                    onClick={() => {
                      setActionsOpen(false);
                      openEdit();
                    }}
                    disabled={busy}
                    title="Editar evento"
                    role="menuitem"
                  >
                    Editar evento
                  </button>
                )}

                {canEdit && (
                  <button
                    className="actions-item danger"
                    onClick={() => {
                      setActionsOpen(false);
                      openDelete();
                    }}
                    disabled={busy}
                    title="Excluir evento"
                    role="menuitem"
                  >
                    Excluir evento
                  </button>
                )}
              </div>
            )}
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="detail-section">
            <h2>Inscritos</h2>

            {participants.length === 0 ? (
              <p className="detail-hint">Ainda não há inscritos.</p>
            ) : (
              <ul className="participants-list">
                {participants.map((p) => {
                  const isMe = meUserId != null && Number(p.id) === Number(meUserId);

                  return (
                    <li key={p.id} className="participant-item">
                      <span className="participant-name">
                        {p.name}
                        {isMe ? " (Você)" : ""}
                        {p?.bringBall ? " 🏐" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ✅ MODAL: inscrição com bola/sem bola */}
      {isBallOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBallModal();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Inscrição</div>
              <button
                className="modal-close"
                onClick={closeBallModal}
                aria-label="Fechar"
                disabled={ballBusy}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="detail-hint" style={{ marginTop: 0 }}>
                Você vai levar bola?
              </p>

              {ballError && <div className="error-box">{ballError}</div>}

              <div className="modal-actions modal-actions-bottom">
                <button
                  className="primary-button"
                  onClick={() => submitRegistration(true)}
                  disabled={ballBusy}
                  title="Inscrever levando bola"
                >
                  {ballBusy ? "..." : "Sim, levo bola 🏐"}
                </button>

                <button
                  className="secondary-button"
                  onClick={() => submitRegistration(false)}
                  disabled={ballBusy}
                  title="Inscrever sem bola"
                >
                  {ballBusy ? "..." : "Não levo bola"}
                </button>

                <button
                  className="secondary-button"
                  onClick={closeBallModal}
                  disabled={ballBusy}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: editar evento */}
      {isEditOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Editar evento</div>
              <button
                className="modal-close"
                onClick={closeEdit}
                aria-label="Fechar"
                disabled={editBusy}
              >
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={submitEdit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Título</label>
                  <input
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Data e hora</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={editEventDateTime}
                    onChange={(e) => setEditEventDateTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Local</label>
                  <input
                    className="input"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Descrição (opcional)</label>
                  <textarea
                    className="textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {editError && <div className="error-box">{editError}</div>}

              <div className="modal-actions modal-actions-bottom">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={editBusy}
                >
                  {editBusy ? "Salvando..." : "Salvar"}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeEdit}
                  disabled={editBusy}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDelete();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Excluir evento</div>
              <button
                className="modal-close"
                onClick={closeDelete}
                aria-label="Fechar"
                disabled={deleteBusy}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="detail-hint" style={{ marginTop: 0 }}>
                Tem certeza que deseja excluir este evento? Essa ação não pode ser desfeita.
              </p>

              {deleteError && <div className="error-box">{deleteError}</div>}

              <div className="modal-actions modal-actions-bottom">
                <button
                  className="primary-button"
                  onClick={confirmDelete}
                  disabled={deleteBusy}
                  style={{
                    background: "rgb(220, 38, 38)",
                    borderColor: "rgb(220, 38, 38)",
                  }}
                >
                  {deleteBusy ? "Excluindo..." : "Sim, excluir"}
                </button>

                <button
                  className="secondary-button"
                  onClick={closeDelete}
                  disabled={deleteBusy}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sorteio */}
      {isDrawOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Sorteio de times</div>
              <button
                className="modal-close"
                onClick={closeDraw}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedParticipants().length < 2 ? (
                <p className="detail-hint">
                  Selecione pelo menos 2 pessoas para sortear.
                </p>
              ) : (
                <div className="teams-grid">
                  {teams.map((t, idx) => (
                    <div
                      key={idx}
                      className={`team-card team-${(idx % 4) + 1}`}
                    >
                      <div className="team-title">Time {idx + 1}</div>
                      <ul className="team-list">
                        {t.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="draw-panel">
                <div className="draw-options">
                  <div className="radio-row">
                    <label className="radio">
                      <input
                        type="radio"
                        name="drawMode"
                        value="all"
                        checked={drawMode === "all"}
                        onChange={() => setDrawMode("all")}
                      />
                      <span>Incluir todos os inscritos</span>
                    </label>

                    <label className="radio">
                      <input
                        type="radio"
                        name="drawMode"
                        value="edit"
                        checked={drawMode === "edit"}
                        onChange={() => setDrawMode("edit")}
                      />
                      <span>Editar participantes do sorteio</span>
                    </label>
                  </div>

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
                </div>

                {drawMode === "edit" && (
                  <div className="draw-edit">
                    <div className="draw-edit-title">
                      Quem participa do sorteio?
                    </div>

                    <div className="checklist">
                      {participants.map((p) => (
                        <label key={p.id} className="check">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[p.id]}
                            onChange={(e) =>
                              setSelectedIds((prev) => ({
                                ...prev,
                                [p.id]: e.target.checked,
                              }))
                            }
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-actions modal-actions-bottom">
                  <button
                    className="primary-button"
                    onClick={doDraw}
                    disabled={selectedParticipants().length < 2}
                  >
                    Sortear novamente
                  </button>
                  <button className="secondary-button" onClick={closeDraw}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
