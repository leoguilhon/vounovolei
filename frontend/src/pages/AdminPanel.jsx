import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import http from "../api/http";
import Avatar from "../components/Avatar";
import "../styles/topbar.css";
import "../styles/admin-panel.css";

function isAdminUser(user) {
  return String(user?.role ?? "").toUpperCase() === "ADMIN";
}

function toDatetimeLocalValue(isoLike) {
  if (!isoLike) return "";
  let s = String(isoLike).trim();
  s = s.replace(/Z$/i, "");
  s = s.replace(/[+-]\d{2}:?\d{2}$/, "");
  s = s.split(".")[0];
  if (!s.includes("T")) return "";
  return s.slice(0, 16);
}

function normalizeDateTimeLocal(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

function formatDateTime(isoLike) {
  if (!isoLike) return "-";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return String(isoLike);
  return d.toLocaleString("pt-BR");
}

export default function AdminPanel() {
  const { user, refreshMe, logout } = useAuth();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [usersQuery, setUsersQuery] = useState("");
  const [eventsQuery, setEventsQuery] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);
  const [changingPasswordUserId, setChangingPasswordUserId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveUserBusy, setSaveUserBusy] = useState(false);
  const [savePasswordBusy, setSavePasswordBusy] = useState(false);
  const [saveEventBusy, setSaveEventBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [saveError, setSaveError] = useState("");

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "USER",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    eventDateTime: "",
    location: "",
    description: "",
    createdByUserId: "",
  });

  const resolvedUser = user ?? me;
  const isAdmin = isAdminUser(resolvedUser);

  const displayName = useMemo(() => {
    const raw = String(resolvedUser?.name ?? "").trim();
    if (!raw) return "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [resolvedUser?.name]);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        const data = (await refreshMe?.()) ?? null;
        if (!mounted) return;
        setMe(data);
      } catch (err) {
        if (!mounted) return;
        if (err?.response?.status === 401) logout?.();
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [refreshMe, logout]);

  useEffect(() => {
    if (resolvedUser && !isAdmin) {
      navigate("/events", { replace: true });
    }
  }, [resolvedUser, isAdmin, navigate]);

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

  async function loadUsers(query = usersQuery) {
    setUsersLoading(true);
    setUsersError("");
    try {
      const { data } = await http.get("/admin/users", {
        params: {
          q: query?.trim() || undefined,
          _ts: Date.now(),
        },
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      if (err?.response?.status === 403) {
        navigate("/events", { replace: true });
        return;
      }
      setUsersError(
        err?.response?.data?.message || "Falha ao carregar usuários."
      );
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadEvents(query = eventsQuery) {
    setEventsLoading(true);
    setEventsError("");
    try {
      const { data } = await http.get("/admin/events", {
        params: {
          q: query?.trim() || undefined,
          _ts: Date.now(),
        },
      });
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      if (err?.response?.status === 403) {
        navigate("/events", { replace: true });
        return;
      }
      setEventsError(err?.response?.data?.message || "Falha ao carregar eventos.");
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers("");
    loadEvents("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function openUserEditor(u) {
    setSaveError("");
    setEditingUserId(u.id);
    setUserForm({
      name: u.name ?? "",
      email: u.email ?? "",
      role: String(u.role ?? "USER").toUpperCase(),
    });
  }

  function openPasswordEditor(userId) {
    setSaveError("");
    setChangingPasswordUserId(userId);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
  }

  function openEventEditor(e) {
    setSaveError("");
    setEditingEventId(e.id);
    setEventForm({
      title: e.title ?? "",
      eventDateTime: toDatetimeLocalValue(e.eventDateTime),
      location: e.location ?? "",
      description: e.description ?? "",
      createdByUserId: String(e.createdByUserId ?? ""),
    });
  }

  async function saveUser(id) {
    if (saveUserBusy) return;
    setSaveUserBusy(true);
    setSaveError("");
    try {
      await http.put(`/admin/users/${id}`, {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
      });
      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      setSaveError(err?.response?.data?.message || "Falha ao atualizar usuário.");
    } finally {
      setSaveUserBusy(false);
    }
  }

  async function changePassword(id) {
    if (savePasswordBusy) return;
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!newPassword) {
      setSaveError("Informe a nova senha.");
      return;
    }
    if (newPassword.length < 6) {
      setSaveError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveError("A confirmação da senha não confere.");
      return;
    }

    setSavePasswordBusy(true);
    setSaveError("");
    try {
      await http.patch(`/admin/users/${id}/password`, {
        newPassword,
      });
      setChangingPasswordUserId(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      setSaveError(err?.response?.data?.message || "Falha ao trocar senha.");
    } finally {
      setSavePasswordBusy(false);
    }
  }

  async function saveEvent(id) {
    if (saveEventBusy) return;
    setSaveEventBusy(true);
    setSaveError("");
    try {
      await http.put(`/admin/events/${id}`, {
        title: eventForm.title.trim(),
        eventDateTime: normalizeDateTimeLocal(eventForm.eventDateTime),
        location: eventForm.location.trim(),
        description: eventForm.description.trim() || null,
        createdByUserId: Number(eventForm.createdByUserId),
      });
      setEditingEventId(null);
      await loadEvents();
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      setSaveError(err?.response?.data?.message || "Falha ao atualizar evento.");
    } finally {
      setSaveEventBusy(false);
    }
  }

  async function removeUser(id) {
    if (deleteBusyId != null) return;
    setDeleteBusyId(`u-${id}`);
    setSaveError("");
    try {
      await http.delete(`/admin/users/${id}`);
      if (editingUserId === id) setEditingUserId(null);
      if (changingPasswordUserId === id) setChangingPasswordUserId(null);
      await loadUsers();
      await loadEvents();
      setDeleteConfirm(null);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      setSaveError(err?.response?.data?.message || "Falha ao remover usuário.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function removeEvent(id) {
    if (deleteBusyId != null) return;
    setDeleteBusyId(`e-${id}`);
    setSaveError("");
    try {
      await http.delete(`/admin/events/${id}`);
      if (editingEventId === id) setEditingEventId(null);
      await loadEvents();
      setDeleteConfirm(null);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
        return;
      }
      setSaveError(err?.response?.data?.message || "Falha ao remover evento.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  function openDeleteUserConfirm(id) {
    if (deleteBusyId != null) return;
    setSaveError("");
    setDeleteConfirm({ type: "user", id });
  }

  function openDeleteEventConfirm(id) {
    if (deleteBusyId != null) return;
    setSaveError("");
    setDeleteConfirm({ type: "event", id });
  }

  function closeDeleteConfirm() {
    if (deleteBusyId != null) return;
    setDeleteConfirm(null);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "user") {
      await removeUser(deleteConfirm.id);
      return;
    }
    await removeEvent(deleteConfirm.id);
  }

  if (resolvedUser && !isAdmin) return null;

  return (
    <div className="admin-page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-center">
            <Link className="brand" to="/events">
              <img className="brand-logo" src="/images/logo-nobg.png" alt="Vou No Vôlei" />
            </Link>
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
                name={resolvedUser?.name}
                email={resolvedUser?.email}
                avatarUrl={resolvedUser?.avatarUrl}
              />
              {displayName ? <span className="profile-label">{displayName}</span> : null}
              <span className={`profile-caret ${menuOpen ? "open" : ""}`}>▾</span>
            </button>

            {menuOpen && (
              <div className="profile-menu" role="menu">
                <Link className="profile-menu-item" to="/profile/edit" onClick={() => setMenuOpen(false)}>
                  Editar perfil
                </Link>
                <Link className="profile-menu-item" to="/admin" onClick={() => setMenuOpen(false)}>
                  Painel Administrativo
                </Link>
                <button
                  className="profile-menu-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    logout?.();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-header">
          <h1>Painel Administrativo</h1>
          <Link className="admin-back" to="/events">
            Voltar para eventos
          </Link>
        </div>

        {saveError ? <div className="admin-alert error">{saveError}</div> : null}

        <section className="admin-section">
          <div className="admin-section-header">
            <h2>Dashboard de Usuários</h2>
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                loadUsers(usersQuery);
              }}
            >
              <input
                value={usersQuery}
                onChange={(e) => setUsersQuery(e.target.value)}
                placeholder="Buscar por ID ou nome"
              />
              <button type="submit">Buscar</button>
              <button type="button" onClick={() => loadUsers(usersQuery)}>
                Atualizar
              </button>
            </form>
          </div>

          {usersLoading ? <p>Carregando usuários...</p> : null}
          {usersError ? <div className="admin-alert error">{usersError}</div> : null}

          {!usersLoading && !usersError && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Role</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{formatDateTime(u.createdAt)}</td>
                      <td className="actions-cell">
                        <button type="button" onClick={() => openUserEditor(u)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => openPasswordEditor(u.id)}>
                          Trocar senha
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deleteBusyId === `u-${u.id}`}
                          onClick={() => openDeleteUserConfirm(u.id)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhum usuário encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section-header">
            <h2>Dashboard de Eventos</h2>
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                loadEvents(eventsQuery);
              }}
            >
              <input
                value={eventsQuery}
                onChange={(e) => setEventsQuery(e.target.value)}
                placeholder="Buscar por ID ou nome do evento"
              />
              <button type="submit">Buscar</button>
              <button type="button" onClick={() => loadEvents(eventsQuery)}>
                Atualizar
              </button>
            </form>
          </div>

          {eventsLoading ? <p>Carregando eventos...</p> : null}
          {eventsError ? <div className="admin-alert error">{eventsError}</div> : null}

          {!eventsLoading && !eventsError && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Data/Hora</th>
                    <th>Local</th>
                    <th>Criador</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td>{e.title}</td>
                      <td>{formatDateTime(e.eventDateTime)}</td>
                      <td>{e.location}</td>
                      <td>{e.createdByUserId}</td>
                      <td className="actions-cell">
                        <button type="button" onClick={() => openEventEditor(e)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deleteBusyId === `e-${e.id}`}
                          onClick={() => openDeleteEventConfirm(e.id)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}

                  {events.length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhum evento encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {editingUserId != null && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <h3>Atualizar usuário #{editingUserId}</h3>
            <div className="admin-form-grid">
              <label>
                Nome
                <input
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </label>
              <label>
                E-mail
                <input
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
            </div>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => saveUser(editingUserId)} disabled={saveUserBusy}>
                {saveUserBusy ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setEditingUserId(null)} disabled={saveUserBusy}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {changingPasswordUserId != null && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <h3>Trocar senha do usuário #{changingPasswordUserId}</h3>
            <div className="admin-form-grid">
              <label>
                Nova senha
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Confirmar nova senha
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() => changePassword(changingPasswordUserId)}
                disabled={savePasswordBusy}
              >
                {savePasswordBusy ? "Salvando..." : "Salvar senha"}
              </button>
              <button
                type="button"
                onClick={() => setChangingPasswordUserId(null)}
                disabled={savePasswordBusy}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEventId != null && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <h3>Atualizar evento #{editingEventId}</h3>
            <div className="admin-form-grid">
              <label>
                Título
                <input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Data e hora
                <input
                  type="datetime-local"
                  value={eventForm.eventDateTime}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      eventDateTime: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Local
                <input
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </label>
              <label>
                ID do criador
                <input
                  value={eventForm.createdByUserId}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      createdByUserId: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="full">
                Descrição
                <textarea
                  rows={4}
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => saveEvent(editingEventId)} disabled={saveEventBusy}>
                {saveEventBusy ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setEditingEventId(null)} disabled={saveEventBusy}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm != null && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDeleteConfirm();
          }}
        >
          <div className="admin-modal">
            <h3>
              {deleteConfirm.type === "user"
                ? `Remover usuário #${deleteConfirm.id}`
                : `Remover evento #${deleteConfirm.id}`}
            </h3>
            <p className="admin-confirm-text">
              {deleteConfirm.type === "user"
                ? "Tem certeza que deseja remover este usuário? Essa ação não pode ser desfeita."
                : "Tem certeza que deseja remover este evento? Essa ação não pode ser desfeita."}
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="danger"
                onClick={confirmDelete}
                disabled={deleteBusyId != null}
              >
                {deleteBusyId != null ? "Removendo..." : "Sim, remover"}
              </button>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleteBusyId != null}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
