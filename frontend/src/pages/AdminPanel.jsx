import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import http from "../api/http";
import Avatar from "../components/Avatar";
import "../styles/topbar.css";
import "../styles/admin-panel.css";

const isAdminUser = (user) => String(user?.role ?? "").toUpperCase() === "ADMIN";
const toDatetimeLocalValue = (value) => String(value ?? "").replace(/Z$/i, "").replace(/[+-]\d{2}:?\d{2}$/, "").split(".")[0].slice(0, 16);
const normalizeDateTimeLocal = (value) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value ?? "").trim()) ? `${String(value).trim()}:00` : String(value ?? "").trim() || null);
const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? "-") : date.toLocaleString("pt-BR");
};
const eventPeriod = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  if (date < today) return "past";
  if (date < tomorrow) return "today";
  if (date < nextWeek) return "next7";
  return "future";
};

export default function AdminPanel() {
  const { user, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [me, setMe] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [usersQuery, setUsersQuery] = useState("");
  const [eventsQuery, setEventsQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userSort, setUserSort] = useState("id");
  const [eventPeriodFilter, setEventPeriodFilter] = useState("ALL");
  const [eventSort, setEventSort] = useState("dateAsc");
  const [editingUserId, setEditingUserId] = useState(null);
  const [changingPasswordUserId, setChangingPasswordUserId] = useState(null);
  const [changingSecretWordUserId, setChangingSecretWordUserId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveUserBusy, setSaveUserBusy] = useState(false);
  const [savePasswordBusy, setSavePasswordBusy] = useState(false);
  const [saveEventBusy, setSaveEventBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "USER" });
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [secretWordForm, setSecretWordForm] = useState({ newSecretWord: "", confirmSecretWord: "" });
  const [eventForm, setEventForm] = useState({ title: "", eventDateTime: "", location: "", description: "", createdByUserId: "" });

  const resolvedUser = user ?? me;
  const isAdmin = isAdminUser(resolvedUser);
  const displayName = useMemo(() => {
    const raw = String(resolvedUser?.name ?? "").trim();
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
  }, [resolvedUser?.name]);

  useEffect(() => {
    let mounted = true;
    refreshMe?.().then((data) => mounted && setMe(data ?? null)).catch((err) => err?.response?.status === 401 && logout?.());
    return () => {
      mounted = false;
    };
  }, [refreshMe, logout]);

  useEffect(() => {
    if (resolvedUser && !isAdmin) navigate("/events", { replace: true });
  }, [resolvedUser, isAdmin, navigate]);

  useEffect(() => {
    function onDocClick(e) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
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
      const { data } = await http.get("/admin/users", { params: { q: query.trim() || undefined, _ts: Date.now() } });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 401) return logout?.();
      if (err?.response?.status === 403) return navigate("/events", { replace: true });
      setUsersError(err?.response?.data?.message || "Falha ao carregar usuários.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadEvents(query = eventsQuery) {
    setEventsLoading(true);
    setEventsError("");
    try {
      const { data } = await http.get("/admin/events", { params: { q: query.trim() || undefined, _ts: Date.now() } });
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status === 401) return logout?.();
      if (err?.response?.status === 403) return navigate("/events", { replace: true });
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

  const stats = useMemo(() => ({
    totalUsers: users.length,
    totalAdmins: users.filter((item) => item.role === "ADMIN").length,
    totalEvents: events.length,
    upcomingEvents: events.filter((item) => new Date(item.eventDateTime) >= new Date()).length,
  }), [users, events]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = usersQuery.trim().toLowerCase();
    const filteredByRole = userRoleFilter === "ALL" ? users : users.filter((item) => item.role === userRoleFilter);
    const filtered = normalizedQuery
      ? filteredByRole.filter((item) => {
          const id = String(item.id ?? "");
          const name = String(item.name ?? "").toLowerCase();
          const email = String(item.email ?? "").toLowerCase();
          return id.includes(normalizedQuery) || name.includes(normalizedQuery) || email.includes(normalizedQuery);
        })
      : filteredByRole;
    return [...filtered].sort((a, b) => {
      if (userSort === "name") return String(a.name).localeCompare(String(b.name), "pt-BR");
      if (userSort === "createdAtDesc") return new Date(b.createdAt) - new Date(a.createdAt);
      return Number(a.id) - Number(b.id);
    });
  }, [users, usersQuery, userRoleFilter, userSort]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = eventsQuery.trim().toLowerCase();
    const filteredByPeriod = eventPeriodFilter === "ALL" ? events : events.filter((item) => eventPeriod(item.eventDateTime) === eventPeriodFilter);
    const filtered = normalizedQuery
      ? filteredByPeriod.filter((item) => {
          const id = String(item.id ?? "");
          const title = String(item.title ?? "").toLowerCase();
          const location = String(item.location ?? "").toLowerCase();
          return id.includes(normalizedQuery) || title.includes(normalizedQuery) || location.includes(normalizedQuery);
        })
      : filteredByPeriod;
    return [...filtered].sort((a, b) => {
      if (eventSort === "dateDesc") return new Date(b.eventDateTime) - new Date(a.eventDateTime);
      if (eventSort === "title") return String(a.title).localeCompare(String(b.title), "pt-BR");
      return new Date(a.eventDateTime) - new Date(b.eventDateTime);
    });
  }, [events, eventsQuery, eventPeriodFilter, eventSort]);

  function resetFeedback() {
    setSaveError("");
    setFlashMessage("");
  }

  function openUserEditor(item) {
    resetFeedback();
    setEditingUserId(item.id);
    setUserForm({ name: item.name ?? "", email: item.email ?? "", role: String(item.role ?? "USER").toUpperCase() });
  }

  function openPasswordEditor(id) {
    resetFeedback();
    setChangingPasswordUserId(id);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
  }

  function openSecretWordEditor(id) {
    resetFeedback();
    setChangingSecretWordUserId(id);
    setSecretWordForm({ newSecretWord: "", confirmSecretWord: "" });
  }

  function openEventEditor(item) {
    resetFeedback();
    setEditingEventId(item.id);
    setEventForm({
      title: item.title ?? "",
      eventDateTime: toDatetimeLocalValue(item.eventDateTime),
      location: item.location ?? "",
      description: item.description ?? "",
      createdByUserId: String(item.createdByUserId ?? ""),
    });
  }

  async function saveUser(id) {
    if (saveUserBusy) return;
    setSaveUserBusy(true);
    resetFeedback();
    try {
      await http.put(`/admin/users/${id}`, { name: userForm.name.trim(), email: userForm.email.trim(), role: userForm.role });
      setEditingUserId(null);
      setFlashMessage("Usuário atualizado com sucesso.");
      await loadUsers();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao atualizar usuário.");
    } finally {
      setSaveUserBusy(false);
    }
  }

  async function changePassword(id) {
    const { newPassword, confirmPassword } = passwordForm;
    if (!newPassword.trim()) return setSaveError("Informe a nova senha.");
    if (newPassword.trim().length < 6) return setSaveError("A senha deve ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setSaveError("A confirmação da senha não confere.");
    setSavePasswordBusy(true);
    resetFeedback();
    try {
      await http.patch(`/admin/users/${id}/password`, { newPassword: newPassword.trim() });
      setChangingPasswordUserId(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setFlashMessage("Senha atualizada com sucesso.");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao trocar senha.");
    } finally {
      setSavePasswordBusy(false);
    }
  }

  async function changeSecretWord(id) {
    const { newSecretWord, confirmSecretWord } = secretWordForm;
    if (!newSecretWord.trim()) return setSaveError("Informe a nova palavra secreta.");
    if (newSecretWord.trim().length < 4) return setSaveError("A palavra secreta deve ter pelo menos 4 caracteres.");
    if (newSecretWord !== confirmSecretWord) return setSaveError("A confirmação da palavra secreta não confere.");
    setSavePasswordBusy(true);
    resetFeedback();
    try {
      await http.patch(`/admin/users/${id}/secret-word`, { newSecretWord: newSecretWord.trim() });
      setChangingSecretWordUserId(null);
      setSecretWordForm({ newSecretWord: "", confirmSecretWord: "" });
      setFlashMessage("Palavra secreta atualizada com sucesso.");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao trocar palavra secreta.");
    } finally {
      setSavePasswordBusy(false);
    }
  }

  async function saveEvent(id) {
    if (saveEventBusy) return;
    setSaveEventBusy(true);
    resetFeedback();
    try {
      await http.put(`/admin/events/${id}`, {
        title: eventForm.title.trim(),
        eventDateTime: normalizeDateTimeLocal(eventForm.eventDateTime),
        location: eventForm.location.trim(),
        description: eventForm.description.trim() || null,
        createdByUserId: Number(eventForm.createdByUserId),
      });
      setEditingEventId(null);
      setFlashMessage("Evento atualizado com sucesso.");
      await loadEvents();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao atualizar evento.");
    } finally {
      setSaveEventBusy(false);
    }
  }

  async function removeUser(id) {
    setDeleteBusyId(`u-${id}`);
    resetFeedback();
    try {
      await http.delete(`/admin/users/${id}`);
      setDeleteConfirm(null);
      setFlashMessage("Usuário removido com sucesso.");
      await loadUsers();
      await loadEvents();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao remover usuário.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function removeEvent(id) {
    setDeleteBusyId(`e-${id}`);
    resetFeedback();
    try {
      await http.delete(`/admin/events/${id}`);
      setDeleteConfirm(null);
      setFlashMessage("Evento removido com sucesso.");
      await loadEvents();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Falha ao remover evento.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  if (resolvedUser && !isAdmin) return null;

  return (
    <div className="admin-page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-center">
            <Link className="brand" to="/events"><img className="brand-logo" src="/images/logo-nobg.png" alt="Vou No Vôlei" /></Link>
          </div>
          <div className="topbar-right" ref={menuRef}>
            <button className="profile-btn" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <Avatar className="profile-avatar" name={resolvedUser?.name} email={resolvedUser?.email} avatarUrl={resolvedUser?.avatarUrl} />
              {displayName ? <span className="profile-label">{displayName}</span> : null}
              <span className={`profile-caret ${menuOpen ? "open" : ""}`}>▾</span>
            </button>
            {menuOpen && <div className="profile-menu" role="menu">
              <Link className="profile-menu-item" to="/profile/edit" onClick={() => setMenuOpen(false)}>Editar perfil</Link>
              <Link className="profile-menu-item" to="/admin" onClick={() => setMenuOpen(false)}>Painel Administrativo</Link>
              <button className="profile-menu-item danger" onClick={() => { setMenuOpen(false); logout?.(); }}>Logout</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="admin-main">
        <section className="admin-hero">
          <div><p className="admin-eyebrow">Operação</p><h1>Painel Administrativo</h1><p className="admin-subtitle">Visão geral da plataforma com filtros rápidos, ordenação e ações diretas.</p></div>
          <Link className="admin-back" to="/events">Voltar para eventos</Link>
        </section>
        <section className="admin-stats-grid">
          <article className="admin-stat-card"><span className="admin-stat-label">Usuários</span><strong>{stats.totalUsers}</strong><small>Total cadastrado</small></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Admins</span><strong>{stats.totalAdmins}</strong><small>Acesso administrativo</small></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Eventos</span><strong>{stats.totalEvents}</strong><small>No sistema</small></article>
          <article className="admin-stat-card accent"><span className="admin-stat-label">Próximos</span><strong>{stats.upcomingEvents}</strong><small>Eventos futuros</small></article>
        </section>
        {flashMessage ? <div className="admin-alert success">{flashMessage}</div> : null}
        {saveError ? <div className="admin-alert error">{saveError}</div> : null}
        <section className="admin-tabs">
          <button type="button" className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Usuários</button>
          <button type="button" className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Eventos</button>
        </section>
        {tab === "users" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <div><h2>Usuários</h2><p>{filteredUsers.length} resultado(s)</p></div>
              <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); loadUsers(usersQuery); }}>
                <input value={usersQuery} onChange={(e) => setUsersQuery(e.target.value)} placeholder="Buscar por ID, nome ou e-mail" />
                <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}><option value="ALL">Todas as roles</option><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
                <select value={userSort} onChange={(e) => setUserSort(e.target.value)}><option value="id">Ordenar por ID</option><option value="name">Ordenar por nome</option><option value="createdAtDesc">Mais recentes</option></select>
                <button type="submit">Buscar</button><button type="button" onClick={() => loadUsers(usersQuery)}>Atualizar</button><button type="button" className="secondary" onClick={() => { setUsersQuery(""); setUserRoleFilter("ALL"); setUserSort("id"); loadUsers(""); }}>Limpar</button>
              </form>
            </div>
            {usersLoading ? <p>Carregando usuários...</p> : null}
            {usersError ? <div className="admin-alert error">{usersError}</div> : null}
            {!usersLoading && !usersError && <TableUsers items={filteredUsers} onEdit={openUserEditor} onPassword={openPasswordEditor} onSecret={openSecretWordEditor} onDelete={(item) => setDeleteConfirm({ type: "user", id: item.id, name: item.name, email: item.email })} deleteBusyId={deleteBusyId} />}
          </section>
        )}
        {tab === "events" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <div><h2>Eventos</h2><p>{filteredEvents.length} resultado(s)</p></div>
              <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); loadEvents(eventsQuery); }}>
                <input value={eventsQuery} onChange={(e) => setEventsQuery(e.target.value)} placeholder="Buscar por ID ou nome do evento" />
                <select value={eventPeriodFilter} onChange={(e) => setEventPeriodFilter(e.target.value)}><option value="ALL">Todos os períodos</option><option value="today">Hoje</option><option value="next7">Próximos 7 dias</option><option value="future">Futuros</option><option value="past">Passados</option></select>
                <select value={eventSort} onChange={(e) => setEventSort(e.target.value)}><option value="dateAsc">Data crescente</option><option value="dateDesc">Data decrescente</option><option value="title">Título</option></select>
                <button type="submit">Buscar</button><button type="button" onClick={() => loadEvents(eventsQuery)}>Atualizar</button><button type="button" className="secondary" onClick={() => { setEventsQuery(""); setEventPeriodFilter("ALL"); setEventSort("dateAsc"); loadEvents(""); }}>Limpar</button>
              </form>
            </div>
            {eventsLoading ? <p>Carregando eventos...</p> : null}
            {eventsError ? <div className="admin-alert error">{eventsError}</div> : null}
            {!eventsLoading && !eventsError && <TableEvents items={filteredEvents} onEdit={openEventEditor} onDelete={(item) => setDeleteConfirm({ type: "event", id: item.id, title: item.title, location: item.location })} deleteBusyId={deleteBusyId} />}
          </section>
        )}
      </main>
      {editingUserId != null && <Modal title={`Atualizar usuário #${editingUserId}`} actions={<><button type="button" onClick={() => saveUser(editingUserId)} disabled={saveUserBusy}>{saveUserBusy ? "Salvando..." : "Salvar"}</button><button type="button" onClick={() => setEditingUserId(null)} disabled={saveUserBusy}>Cancelar</button></>}>
        <div className="admin-form-grid"><label>Nome<input value={userForm.name} onChange={(e) => setUserForm((v) => ({ ...v, name: e.target.value }))} /></label><label>E-mail<input value={userForm.email} onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))} /></label><label>Role<select value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value }))}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></label></div>
      </Modal>}
      {changingPasswordUserId != null && <Modal title={`Trocar senha do usuário #${changingPasswordUserId}`} actions={<><button type="button" onClick={() => changePassword(changingPasswordUserId)} disabled={savePasswordBusy}>{savePasswordBusy ? "Salvando..." : "Salvar senha"}</button><button type="button" onClick={() => setChangingPasswordUserId(null)} disabled={savePasswordBusy}>Cancelar</button></>}>
        <div className="admin-form-grid"><label>Nova senha<input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((v) => ({ ...v, newPassword: e.target.value }))} /></label><label>Confirmar nova senha<input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((v) => ({ ...v, confirmPassword: e.target.value }))} /></label></div>
      </Modal>}
      {changingSecretWordUserId != null && <Modal title={`Trocar palavra secreta do usuário #${changingSecretWordUserId}`} actions={<><button type="button" onClick={() => changeSecretWord(changingSecretWordUserId)} disabled={savePasswordBusy}>{savePasswordBusy ? "Salvando..." : "Salvar palavra secreta"}</button><button type="button" onClick={() => setChangingSecretWordUserId(null)} disabled={savePasswordBusy}>Cancelar</button></>}>
        <div className="admin-form-grid"><label>Nova palavra secreta<input type="password" value={secretWordForm.newSecretWord} onChange={(e) => setSecretWordForm((v) => ({ ...v, newSecretWord: e.target.value }))} /></label><label>Confirmar nova palavra secreta<input type="password" value={secretWordForm.confirmSecretWord} onChange={(e) => setSecretWordForm((v) => ({ ...v, confirmSecretWord: e.target.value }))} /></label></div>
      </Modal>}
      {editingEventId != null && <Modal title={`Atualizar evento #${editingEventId}`} actions={<><button type="button" onClick={() => saveEvent(editingEventId)} disabled={saveEventBusy}>{saveEventBusy ? "Salvando..." : "Salvar"}</button><button type="button" onClick={() => setEditingEventId(null)} disabled={saveEventBusy}>Cancelar</button></>}>
        <div className="admin-form-grid"><label>Título<input value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} /></label><label>Data e hora<input type="datetime-local" value={eventForm.eventDateTime} onChange={(e) => setEventForm((v) => ({ ...v, eventDateTime: e.target.value }))} /></label><label>Local<input value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} /></label><label>ID do criador<input value={eventForm.createdByUserId} onChange={(e) => setEventForm((v) => ({ ...v, createdByUserId: e.target.value }))} /></label><label className="full">Descrição<textarea rows={4} value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} /></label></div>
      </Modal>}
      {deleteConfirm && <Modal title={deleteConfirm.type === "user" ? `Remover usuário #${deleteConfirm.id}` : `Remover evento #${deleteConfirm.id}`} actions={<><button type="button" className="danger" onClick={() => deleteConfirm.type === "user" ? removeUser(deleteConfirm.id) : removeEvent(deleteConfirm.id)} disabled={deleteBusyId != null}>{deleteBusyId ? "Removendo..." : "Sim, remover"}</button><button type="button" onClick={() => setDeleteConfirm(null)} disabled={deleteBusyId != null}>Cancelar</button></>}>
        <p className="admin-confirm-text">{deleteConfirm.type === "user" ? `Tem certeza que deseja remover ${deleteConfirm.name} (${deleteConfirm.email})?` : `Tem certeza que deseja remover o evento "${deleteConfirm.title}" em ${deleteConfirm.location}?`}</p>
      </Modal>}
    </div>
  );
}

function TableUsers({ items, onEdit, onPassword, onSecret, onDelete, deleteBusyId }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Role</th><th>Criado em</th><th>Ações</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.email}</td><td><span className={`admin-badge ${item.role === "ADMIN" ? "admin" : ""}`}>{item.role}</span></td><td>{formatDateTime(item.createdAt)}</td><td className="actions-cell"><button type="button" className="primary" onClick={() => onEdit(item)}>Editar</button><button type="button" onClick={() => onPassword(item.id)}>Trocar senha</button><button type="button" onClick={() => onSecret(item.id)}>Palavra secreta</button><button type="button" className="danger" disabled={deleteBusyId === `u-${item.id}`} onClick={() => onDelete(item)}>{deleteBusyId === `u-${item.id}` ? "Removendo..." : "Remover"}</button></td></tr>)}{items.length === 0 && <tr><td colSpan={6}>Nenhum usuário encontrado para os filtros atuais.</td></tr>}</tbody></table></div>;
}

function TableEvents({ items, onEdit, onDelete, deleteBusyId }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Título</th><th>Data/Hora</th><th>Local</th><th>Criador</th><th>Ações</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.title}</td><td>{formatDateTime(item.eventDateTime)}</td><td>{item.location}</td><td>{item.createdByUserId}</td><td className="actions-cell"><button type="button" className="primary" onClick={() => onEdit(item)}>Editar</button><button type="button" className="danger" disabled={deleteBusyId === `e-${item.id}`} onClick={() => onDelete(item)}>{deleteBusyId === `e-${item.id}` ? "Removendo..." : "Remover"}</button></td></tr>)}{items.length === 0 && <tr><td colSpan={6}>Nenhum evento encontrado para os filtros atuais.</td></tr>}</tbody></table></div>;
}

function Modal({ title, children, actions }) {
  return <div className="admin-modal-overlay" role="dialog" aria-modal="true"><div className="admin-modal"><h3>{title}</h3>{children}<div className="admin-modal-actions">{actions}</div></div></div>;
}
