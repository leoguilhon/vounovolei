import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import http from "../api/http";
import "../styles/edit-profile.css";

export default function EditProfile() {
  const { user, setUser, logout } = useAuth();

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
        const { data } = await http.get("/auth/me");
        if (!mounted) return;

        setName(data?.name ?? "");
        setEmail(data?.email ?? "");

        if (setUser) setUser(data);
      } catch (e) {
        if (!mounted) return;

        if (e?.response?.status === 401) {
          logout?.();
          return;
        }

        // fallback: usa contexto se tiver
        if (user) {
          setName(user.name ?? "");
          setEmail(user.email ?? "");
        } else {
          setError(
            e?.response?.data?.message ||
              "Não foi possível carregar seus dados."
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
  }, [user, setUser, logout]);

  function validateProfile() {
    if (!name.trim()) return "Nome é obrigatório.";
    if (!email.trim()) return "E-mail é obrigatório.";

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) return "E-mail inválido.";

    return "";
  }

  function validatePassword() {
    if (!hasPasswordFields) return "";

    if (!currentPassword.trim()) return "Informe sua senha atual.";
    if (!newPassword.trim()) return "Informe a nova senha.";
    if (newPassword.trim().length < 6)
      return "A nova senha deve ter pelo menos 6 caracteres.";
    if (newPassword !== confirmNewPassword)
      return "A confirmação da nova senha não confere.";
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
      const payload = {
        name: name.trim(),
        email: email.trim(),
      };

      const { data } = await http.patch("/auth/me", payload);

      if (setUser) setUser(data);

      setMsg("Nome e e-mail atualizados com sucesso.");
    } catch (e) {
      if (e?.response?.status === 401) {
        logout?.();
        return;
      }

      setError(
        e?.response?.data?.message ||
          "Não foi possível atualizar nome/e-mail. Tente novamente."
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
          "Não foi possível alterar a senha. Verifique a senha atual e tente novamente."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="page edit-profile">
        <div className="container">
          <div className="card">
            <p>Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page edit-profile">
      <div className="container">
        <div className="header-row">
          <h1>Editar Perfil</h1>
          <Link className="btn btn-secondary" to="/events">
            Voltar
          </Link>
        </div>

        {msg ? <div className="alert success">{msg}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {/* FORM 1: Nome + Email */}
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

        {/* FORM 2: Trocar senha */}
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
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="field">
              <label>Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
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
      </div>
    </div>
  );
}
