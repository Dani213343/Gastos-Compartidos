// frontend/src/components/ClientDashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ClientSummary from "./ClientSummary";
import GroupsManager from "./GroupsManager";
import ExpenseForm from "./ExpenseForm";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import AlertsPanel from "./AlertsPanel";
import SettingsCardsSection from "./settings/SettingsCardsSection";

import {
  FaUsers,
  FaCog,
  FaTachometerAlt,
  FaSignOutAlt,
} from "react-icons/fa";

const safeGet = (key, fallback = "") => {
  const v = localStorage.getItem(key);
  if (
    v === null ||
    v === undefined ||
    v === "undefined" ||
    v === "null" ||
    String(v).trim() === ""
  ) {
    return fallback;
  }
  return v;
};

const CURRENCIES = [
  { code: "COP", label: "Peso colombiano" },
  { code: "USD", label: "Dólar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
];

const ClientDashboard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, setTheme } = useTheme();
  const { lang, setLang, t, locale } = useI18n();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(() => safeGet("userId", ""));

  const [defaultCurrency, setDefaultCurrency] = useState(
    safeGet("defaultCurrency", "COP")
  );
  const [emailNotif, setEmailNotif] = useState(safeGet("emailNotif", "on") === "on");
  const [expenseAlerts, setExpenseAlerts] = useState(
    safeGet("expenseAlerts", "on") === "on"
  );

  // Detectar pestaña activa
  const pathKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/client-dashboard/groups")) return "groups";
    if (p.startsWith("/client-dashboard/summary")) return "summary";
    if (p.startsWith("/client-dashboard/settings")) return "settings";
    return "welcome";
  }, [location.pathname]);

  // Reloj y datos usuario
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const token = safeGet("token", "");

    if (token) {
      setUserEmail(safeGet("userEmail", "cliente@ejemplo.com"));
      setUserName(safeGet("userName", "Cliente"));
      setUserId(safeGet("userId", ""));

      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => {
          if (!u) return;
          const id = u._id || u.id || u.sub || "";
          const name = u.name || u.fullName || "Cliente";
          const email = u.email || userEmail;
          setUserId(id);
          setUserName(name);
          setUserEmail(email);
          localStorage.setItem("userId", id);
          localStorage.setItem("userName", name);
          localStorage.setItem("userEmail", email);
        })
        .catch(() => {});
    }
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (
      window.confirm(
        lang === "en" ? "Are you sure you want to log out?" : "¿Seguro que quieres cerrar sesión?"
      )
    ) {
      localStorage.clear();
      navigate("/", { replace: true });
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (lang === "en") {
      if (hour < 12) return "Good morning!";
      if (hour < 18) return "Good afternoon!";
      return "Good evening!";
    }
    if (hour < 12) return "¡Buenos días!";
    if (hour < 18) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  };

  const formatTime = (date) =>
    date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date) =>
    date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const saveProfile = async () => {
    const token = safeGet("token", "");
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
        body: JSON.stringify({ name: userName, email: userEmail }),
      }).catch(() => ({ ok: false }));

      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", userEmail);

      if (!res.ok) {
        alert(lang === "en" ? "Profile updated locally." : "Perfil actualizado localmente.");
        return;
      }
      alert(lang === "en" ? "Profile updated" : "Perfil actualizado");
    } catch {
      alert(lang === "en" ? "Could not update profile" : "No se pudo actualizar el perfil");
    }
  };

  const savePreferences = () => {
    localStorage.setItem("defaultCurrency", defaultCurrency);
    localStorage.setItem("emailNotif", emailNotif ? "on" : "off");
    localStorage.setItem("expenseAlerts", expenseAlerts ? "on" : "off");
    window.dispatchEvent(new Event("preferences:updated"));
    alert(lang === "en" ? "Preferences saved" : "Preferencias guardadas");
  };

  const deleteAccount = async () => {
    if (
      !window.confirm(
        lang === "en"
          ? "Are you sure you want to delete your account?"
          : "¿Seguro que deseas eliminar tu cuenta?"
      )
    )
      return;
    const token = safeGet("token", "");
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
      });
      if (!res.ok) {
        let msg = lang === "en" ? "Could not delete account." : "No se pudo eliminar la cuenta.";
        try {
          const data = await res.json();
          if (data?.msg) msg = data.msg;
        } catch {}
        throw new Error(msg);
      }
      localStorage.clear();
      navigate("/", { replace: true });
    } catch (e) {
      alert(e.message);
    }
  };

  const effectiveUserId = userId || safeGet("userId", "");

  const renderContent = () => {
    switch (pathKey) {
      case "welcome":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-8 text-center">
              <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-3">
                {getGreeting()}
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-200 mb-2">
                {lang === "en" ? "Welcome" : "¡Bienvenido"}, {userName}!
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {formatDate(currentTime)} – {formatTime(currentTime)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
              {effectiveUserId ? (
                <ClientSummary
                  key={effectiveUserId}
                  userId={effectiveUserId}
                  token={safeGet("token", "")}
                />
              ) : (
                <div className="text-gray-500 dark:text-gray-400">
                  {lang === "en" ? "Loading…" : "Cargando…"}
                </div>
              )}
            </div>

            {expenseAlerts && (
              <div className="bg-white/0 dark:bg-transparent">
                <AlertsPanel />
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div className="space-y-8">
            {/* PERFIL */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
                {lang === "en" ? "Profile settings" : "Configuración de perfil"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {lang === "en" ? "Name" : "Nombre"}
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {lang === "en" ? "Email" : "Correo"}
                  </label>
                  <input
                    type="email"
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  {lang === "en" ? "Save profile" : "Guardar perfil"}
                </button>
              </div>
            </section>

            {/* PREFERENCIAS */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
                {lang === "en" ? "Preferences" : "Preferencias"}
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {lang === "en" ? "Default currency" : "Divisa por defecto"}
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {lang === "en" ? "Theme" : "Tema"}
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="light">{lang === "en" ? "Light" : "Claro"}</option>
                    <option value="dark">{lang === "en" ? "Dark" : "Oscuro"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {lang === "en" ? "Language" : "Idioma"}
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                  />
                  {lang === "en" ? "Email notifications" : "Notificaciones por correo"}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={expenseAlerts}
                    onChange={(e) => setExpenseAlerts(e.target.checked)}
                  />
                  {lang === "en"
                    ? "Alerts when I'm assigned an expense"
                    : "Alertas cuando me asignen un gasto"}
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={savePreferences}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  {lang === "en" ? "Save preferences" : "Guardar preferencias"}
                </button>
              </div>
            </section>

            {/* MÉTODOS DE PAGO (TARJETAS) */}

              <SettingsCardsSection />
              
            {/* ZONA DE PELIGRO */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-rose-200">
              <h3 className="text-lg font-semibold text-rose-700 mb-4">
                {lang === "en" ? "Danger zone" : "Zona de peligro"}
              </h3>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => {
                    localStorage.clear();
                    navigate("/", { replace: true });
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  {lang === "en"
                    ? "Log out from all devices"
                    : "Cerrar sesión en todos los dispositivos"}
                </button>

                <button
                  onClick={deleteAccount}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  {lang === "en" ? "Delete my account" : "Eliminar mi cuenta"}
                </button>
              </div>
            </section>
          </div>
        );

      default:
        return (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
            {effectiveUserId ? (
              <ClientSummary
                key={effectiveUserId}
                userId={effectiveUserId}
                token={safeGet("token", "")}
              />
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                {lang === "en" ? "Loading…" : "Cargando…"}
              </div>
            )}
          </div>
        );
    }
  };

  const menu = [
    { key: "welcome", path: "/client-dashboard", icon: <FaTachometerAlt />, label: lang === "en" ? "Home" : "Inicio" },
    { key: "groups", path: "/client-dashboard/groups", icon: <FaUsers />, label: lang === "en" ? "Groups" : "Grupos" },
    { key: "settings", path: "/client-dashboard/settings", icon: <FaCog />, label: lang === "en" ? "Settings" : "Configuración" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-indigo-700 dark:bg-indigo-800 text-white flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">
          {lang === "en" ? "My Dashboard" : "Mi Panel"}
        </h2>

        <nav className="flex-1">
          <ul className="space-y-3">
            {menu.map((item) => {
              const isActive = pathKey === item.key || (children && item.key === "groups");
              return (
                <li
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    isActive ? "bg-indigo-600 text-white" : "hover:bg-indigo-500/80"
                  }`}
                >
                  {item.icon} {item.label}
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white mt-6"
        >
          <FaSignOutAlt /> {lang === "en" ? "Log out" : "Cerrar sesión"}
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        {children ? children : renderContent()}
      </main>
    </div>
  );
};

export default ClientDashboard;
