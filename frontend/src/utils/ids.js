// src/utils/ids.js
export const toId = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    if (val._id) return String(val._id).trim();
    if (typeof val.toString === "function") return String(val.toString()).trim();
    return "";
  }
  return String(val).trim();
};

export const equalsId = (a, b) => toId(a) === toId(b);

export const isOwner = (group, userId) => equalsId(group?.owner, userId);

// 🔐 Fallback robusto: intentar sacar el id del JWT si no llegó userId
export const getCurrentUserId = ({ userId, token }) => {
  // 1) Prop explícita
  let raw = userId ?? null;

  // 2) localStorage (si lo usas en tu app)
  if (!raw) raw = localStorage.getItem("userId");

  // 3) Si lo que hay es un JSON stringificado, parsea
  try {
    if (raw && typeof raw === "string" && (raw.startsWith("{") || raw.startsWith("\""))) {
      const parsed = JSON.parse(raw);
      raw = parsed?._id || parsed?.id || parsed || raw;
    }
  } catch (_) { /* ignore */ }

  // 4) Fallback: decodificar JWT (sin validar firma) para extraer sub/id/_id
  if (!raw && token) {
    try {
      const base64 = token.split(".")[1];
      const payload = JSON.parse(atob(base64));
      raw = payload?.sub || payload?.id || payload?._id || null;
    } catch (_) { /* ignore */ }
  }

  return toId(raw);
};
