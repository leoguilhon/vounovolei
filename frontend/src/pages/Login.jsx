import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      navigate(location.pathname, {
        replace: true,
        state: location.state.email ? { email: location.state.email } : null,
      });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (isAuthenticated) navigate("/events", { replace: true });
  }, [isAuthenticated, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      const code = backendMsg || err?.message;

      setError(
        code === "INVALID_CREDENTIALS"
          ? "Email ou senha inválidos. Verifique e tente novamente."
          : code === "TOKEN_NAO_RETORNADO"
          ? "Login ok, mas o backend não retornou o token."
          : backendMsg || "Falha no login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <img className="auth-brand-logo" src="/images/logo-nobg.png" alt="Vou No Vôlei" />
        </div>
        <h1 className="auth-title">Entrar</h1>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div className="auth-actions">
          <button className="auth-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={() => navigate("/forgot-password", { state: { email } })}
          >
            Esqueci minha senha
          </button>

          <p className="auth-footer">
            Não tem conta? <Link to="/register">Criar agora</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
