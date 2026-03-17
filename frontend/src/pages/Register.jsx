import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "../styles/auth.css";

const MIN_SECRET_WORD_LENGTH = 4;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretWord, setSecretWord] = useState("");
  const [confirmSecretWord, setConfirmSecretWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (secretWord.trim().length < MIN_SECRET_WORD_LENGTH) {
      setError("A palavra secreta deve ter pelo menos 4 caracteres.");
      return;
    }

    if (secretWord.trim() !== confirmSecretWord.trim()) {
      setError("A confirmação da palavra secreta não confere.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        confirmPassword,
        secretWord,
        confirmSecretWord,
      });
      navigate("/events");
    } catch (err) {
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      const code = backendMsg || err?.message;
      const msg =
        code === "EMAIL_ALREADY_IN_USE"
          ? "Este email já está em uso. Use outro ou faça login."
          : code === "PASSWORD_CONFIRMATION_MISMATCH"
          ? "As senhas não conferem."
          : code === "SECRET_WORD_CONFIRMATION_MISMATCH"
          ? "A confirmação da palavra secreta não confere."
          : backendMsg || "Falha ao cadastrar. Tente novamente.";
      setError(msg);
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
        <h1 className="auth-title">Criar conta</h1>

        <div className="auth-field">
          <label>Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="auth-field">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="auth-field">
          <label>Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label>Palavra secreta</label>
            <span className="auth-tooltip" tabIndex={0} aria-label="O que é palavra secreta?">
              ?
              <span className="auth-tooltip-bubble">
                É uma informação que só você conhece e será usada para validar a redefinição da sua senha.
              </span>
            </span>
          </div>
          <input
            type="password"
            value={secretWord}
            onChange={(e) => setSecretWord(e.target.value)}
            placeholder="Sua palavra secreta"
            required
            minLength={MIN_SECRET_WORD_LENGTH}
          />
        </div>

        <div className="auth-field">
          <label>Confirmar palavra secreta</label>
          <input
            type="password"
            value={confirmSecretWord}
            onChange={(e) => setConfirmSecretWord(e.target.value)}
            placeholder="Repita a palavra secreta"
            required
            minLength={MIN_SECRET_WORD_LENGTH}
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button className="auth-button" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>

          <p className="auth-footer">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
