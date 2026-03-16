import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import http from "../api/http";
import "../styles/auth.css";

function mapErrorMessage(code) {
  if (code === "INVALID_SECRET_WORD_CREDENTIALS") {
    return "E-mail ou palavra secreta inválidos. Verifique e tente novamente.";
  }
  if (code === "FORGOT_PASSWORD_RESET_NOT_AVAILABLE_YET") {
    return "Esta conta já redefiniu a senha nas últimas 24 horas. Tente novamente mais tarde.";
  }
  if (code === "INVALID_RESET_AUTHORIZATION") {
    return "A autorização para redefinir a senha expirou ou é inválida. Valide a palavra secreta novamente.";
  }
  if (code === "PASSWORD_CONFIRMATION_MISMATCH") {
    return "A confirmação da nova senha não confere.";
  }
  if (code === "PASSWORD_TOO_SHORT") {
    return "A nova senha deve ter pelo menos 6 caracteres.";
  }
  if (code === "PASSWORD_MUST_BE_DIFFERENT") {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (code === "NEW_PASSWORD_REQUIRED" || code === "NEW_PASSWORD_CONFIRMATION_REQUIRED") {
    return "Preencha a nova senha e a confirmação.";
  }

  return "Não foi possível concluir a solicitação. Tente novamente.";
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [secretWord, setSecretWord] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetAuthorization, setResetAuthorization] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  async function handleValidateSecret(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await http.post("/auth/forgot-password/validate-secret", {
        email,
        secretWord,
      });

      setResetAuthorization(data?.resetAuthorization || "");
      setStep(2);
      setSuccess("Validação concluída. Defina a nova senha.");
    } catch (err) {
      const code = err?.response?.data?.message || err?.response?.data?.error;
      setError(mapErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmNewPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);
    try {
      await http.post("/auth/forgot-password/reset", {
        email,
        resetAuthorization,
        newPassword,
        confirmNewPassword,
      });

      navigate("/login", {
        replace: true,
        state: {
          email,
          successMessage: "Senha redefinida com sucesso. Faça login com a nova senha.",
        },
      });
    } catch (err) {
      const code = err?.response?.data?.message || err?.response?.data?.error;
      setError(mapErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  function handleReturnToStepOne() {
    setStep(1);
    setResetAuthorization("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
    setSuccess("");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={step === 1 ? handleValidateSecret : handleResetPassword}>
        <div className="auth-brand">
          <img className="auth-brand-logo" src="/images/logo-nobg.png" alt="Vou No Vôlei" />
        </div>

        <h1 className="auth-title">Esqueci minha senha</h1>
        <p className="auth-subtitle">
          {step === 1
            ? "Confirme seu e-mail e sua palavra secreta."
            : "Defina uma nova senha para acessar sua conta."}
        </p>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            disabled={step === 2}
          />
        </div>

        {step === 1 ? (
          <div className="auth-field">
            <label>Palavra secreta</label>
            <input
              type="password"
              value={secretWord}
              onChange={(e) => setSecretWord(e.target.value)}
              placeholder="Sua palavra secreta"
              minLength={4}
              required
            />
          </div>
        ) : (
          <>
            <div className="auth-field">
              <label>Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div className="auth-field">
              <label>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          </>
        )}

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <button className="auth-button" disabled={loading}>
          {loading
            ? step === 1
              ? "Validando..."
              : "Redefinindo..."
            : step === 1
            ? "Validar palavra secreta"
            : "Salvar nova senha"}
        </button>

        {step === 2 && (
          <button type="button" className="auth-link-button" onClick={handleReturnToStepOne}>
            Voltar para validar novamente
          </button>
        )}

        <p className="auth-footer">
          Lembrou da senha? <Link to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  );
}
