import { useEffect, useMemo, useState } from "react";
import "../styles/avatar.css";

const MAX_INITIALS = 2;

function getInitialsFromName(name) {
  const clean = String(name ?? "").trim();
  if (!clean) return "";

  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, MAX_INITIALS).toUpperCase();
  }

  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return `${first}${last}`.toUpperCase();
}

function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  if (avatarUrl.startsWith("blob:") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }

  const base = import.meta.env.VITE_API_URL || "";
  if (!base) return avatarUrl;

  if (base.endsWith("/") && avatarUrl.startsWith("/")) {
    return `${base.slice(0, -1)}${avatarUrl}`;
  }

  if (!base.endsWith("/") && !avatarUrl.startsWith("/")) {
    return `${base}/${avatarUrl}`;
  }

  return `${base}${avatarUrl}`;
}

export default function Avatar({ name, email, avatarUrl, size, className }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = useMemo(() => {
    const fromName = getInitialsFromName(name);
    if (fromName) return fromName;

    const fromEmail = getInitialsFromName(email);
    if (fromEmail) return fromEmail;

    return "?";
  }, [name, email]);

  const src = useMemo(() => resolveAvatarSrc(avatarUrl), [avatarUrl]);

  const style = useMemo(() => {
    if (!size) return undefined;
    const fontSize = Math.max(12, Math.round(size * 0.36));
    return { width: size, height: size, fontSize };
  }, [size]);

  return (
    <span
      className={["avatar", className].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={name || email || "Avatar"}
    >
      {src && !imgError ? (
        <img
          className="avatar-img"
          src={src}
          alt={name || email || "Avatar"}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="avatar-fallback">{initials}</span>
      )}
    </span>
  );
}
