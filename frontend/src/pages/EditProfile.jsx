import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import http from "../api/http";
import Avatar from "../components/Avatar";
import "../styles/topbar.css";
import "../styles/edit-profile.css";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function EditProfile() {
  const { user, setUser, refreshMe, logout } = useAuth();

  // header/menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [me, setMe] = useState(null);
  const fileInputRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [avatarError, setAvatarError] = useState("");

  function capitalizeFirst(text) {
    const s = String(text ?? "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadMeTopbar() {
      try {
        const data = (await refreshMe?.()) ?? null;
        if (!mounted) return;
        setMe(data);
      } catch (err) {
        if (!mounted) return;
        if (err?.response?.status === 401) logout?.();
      }
    }

    loadMeTopbar();

    return () => {
      mounted = false;
    };
  }, [refreshMe, logout]);

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
    if (!avatarPreview) return undefined;
    return () => {
      URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function resetAvatarSelection() {
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSelectAvatarFile(e) {
    const file = e.target.files?.[0];
    setAvatarError("");
    setAvatarMsg("");

    if (!file) {
      resetAvatarSelection();
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Formato invalido. Use JPG, PNG ou WEBP.");
      resetAvatarSelection();
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("A imagem deve ter no maximo 2MB.");
      resetAvatarSelection();
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  }

  async function handleSaveAvatar() {
    if (!avatarFile || avatarSaving || avatarRemoving) return;

    setAvatarSaving(true);
    setAvatarError("");
    setAvatarMsg("");

    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      await http.put("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await refreshMe?.();
      resetAvatarSelection();
      setAvatarMsg("Foto atualizada com sucesso.");
    } catch (e) {
      if (e?.response?.status === 401) {
        logout?.();
        return;
      }

      setAvatarError(
        e?.response?.data?.message ||
          "Nao foi possivel atualizar a foto. Tente novamente."
      );
      console.error("PUT /auth/me/avatar ERROR:", e);
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    if (avatarRemoving || avatarSaving) return;

    setAvatarRemoving(true);
    setAvatarError("");
    setAvatarMsg("");

    try {
      await http.delete("/auth/me/avatar");
      await refreshMe?.();
      resetAvatarSelection();
      setAvatarMsg("Foto removida com sucesso.");
    } catch (e) {
      if (e?.response?.status === 401) {
        logout?.();
        return;
      }

      setAvatarError(
        e?.response?.data?.message ||
          "Nao foi possivel remover a foto. Tente novamente."
      );
      console.error("DELETE /auth/me/avatar ERROR:", e);
    } finally {
      setAvatarRemoving(false);
    }
  }

  // ===== pagina edit profile (seu codigo original) =====

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const hasPasswordFields =
    currentPassword.trim() || newPassword.trim() || confirmNewPassword.trim();

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      setLoading(true);
      setError("");
      setMsg("");

      try {
        const data = (await refreshMe?.()) ?? null;
        if (!mounted) return;

        setName(data?.name ?? "");
        setEmail(data?.email ?? "");
      } catch (e) {
        if (!mounted) return;

        if (e?.response?.status === 401) {
          logout?.();
          return;
        }

        if (user) {
          setName(user.name ?? "");
          setEmail(user.email ?? "");
        } else {
          setError(
            e?.response?.data?.message || "Nao foi possivel carregar seus dados."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [refreshMe, logout]);

  function validateProfile() {
    if (!name.trim()) return "Nome e obrigatorio.";
    if (!email.trim()) return "E-mail e obrigatorio.";

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) return "E-mail invalido.";

    return "";
  }

  function validatePassword() {
    if (!hasPasswordFields) return "";

    if (!currentPassword.trim()) return "Informe sua senha atual.";
    if (!newPassword.trim()) return "Informe a nova senha.";
    if (newPassword.trim().length < 6)
      return "A nova senha deve ter pelo menos 6 caracteres.";
    if (newPassword !== confirmNewPassword)
      return "A confirmacao da nova senha nao confere.";
    if (currentPassword === newPassword)
      return "A nova senha deve ser diferente da senha atual.";

    return "";
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    const v = validateProfile();
    if (v) {
      setError(v);
      return;
    }

    setSavingProfile(true);
    try {
      const payload = { name: name.trim(), email: email.trim() };
      await http.patch("/auth/me", payload);
      await refreshMe?.();

      setMsg("Nome e e-mail atualizados com sucesso.");
    } catch (e) {
      if (e?.response?.status === 401) {
        logout?.();
        return;
      }

      setError(
        e?.response?.data?.message ||
          "Nao foi possivel atualizar nome/e-mail. Tente novamente."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    const v = validatePassword();
    if (v) {
      setError(v);
      return;
    }

    if (!hasPasswordFields) {
      setError("Preencha os campos de senha para alterar.");
      return;
    }

    setSavingPassword(true);
    try {
      const payload = {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      };

      await http.patch("/auth/me/password", payload);

      setMsg("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      if (e?.response?.status === 401) {
        logout?.();
        return;
      }

      setError(
        e?.response?.data?.message ||
          "Nao foi possivel alterar a senha. Verifique a senha atual e tente novamente."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const avatarDisplayUrl = avatarPreview || avatarUrl;
  const isAvatarBusy = avatarSaving || avatarRemoving;

  return (
    <div className="page edit-profile">
      {/* HEADER */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-center">
            <div className="brand">
              <img
                className="brand-logo"
                src="/images/logo-nobg.png"
                alt="Vou No Volei"
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
                {"\u25BE"}
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

      {/* CONTEUDO */}
      <div className="container">
        <div className="header-row">
          <h1>Editar Perfil</h1>
          <Link className="btn btn-secondary" to="/events">
            Voltar
          </Link>
        </div>

        {loading ? (
          <div className="card">
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {msg ? <div className="alert success">{msg}</div> : null}
            {error ? <div className="alert error">{error}</div> : null}

            <div className="card form avatar-card">
              <h2 className="section-title">Foto de perfil</h2>
              <p className="section-hint">JPG, PNG ou WEBP ate 2MB.</p>

              <div className="avatar-row">
                <Avatar
                  name={avatarName}
                  email={avatarEmail}
                  avatarUrl={avatarDisplayUrl}
                  size={96}
                />

                <div className="avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSelectAvatarFile}
                    className="avatar-file"
                  />

                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAvatarBusy}
                  >
                    Trocar foto
                  </button>

                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={!avatarFile || isAvatarBusy}
                  >
                    {avatarSaving ? "Salvando..." : "Salvar"}
                  </button>

                  {avatarUrl ? (
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isAvatarBusy}
                    >
                      {avatarRemoving ? "Removendo..." : "Remover foto"}
                    </button>
                  ) : null}
                </div>
              </div>

              {avatarMsg ? <div className="alert success">{avatarMsg}</div> : null}
              {avatarError ? <div className="alert error">{avatarError}</div> : null}
            </div>

            <form className="card form" onSubmit={handleSaveProfile}>
              <h2 className="section-title">Dados do perfil</h2>

              <div className="form-grid">
                <div className="field">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>

                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={savingProfile}
                  type="submit"
                >
                  {savingProfile ? "Salvando..." : "Salvar nome e e-mail"}
                </button>
              </div>
            </form>

            <form className="card form" onSubmit={handleChangePassword}>
              <h2 className="section-title">Trocar senha</h2>
              <p className="section-hint">
                Preencha apenas se quiser alterar a senha.
              </p>

              <div className="form-grid">
                <div className="field">
                  <label>Senha atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="current-password"
                  />
                </div>

                <div className="field">
                  <label>Nova senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="new-password"
                  />
                </div>

                <div className="field">
                  <label>Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={savingPassword}
                  type="submit"
                >
                  {savingPassword ? "Salvando..." : "Alterar senha"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
