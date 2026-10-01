import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

// Locales útiles para Intl
export const LOCALES = { es: "es-ES", en: "en-US" };

// Pequeño diccionario (extiéndelo donde lo necesites)
const dict = {
  es: {
    home: "Inicio",
    groups: "Grupos",
    summary: "Resumen",
    settings: "Configuración",
    myDashboard: "Mi Panel",
    logout: "Cerrar sesión",
    welcome: "¡Bienvenido",
    preferencesSaved: "Preferencias guardadas",
    profileSettings: "Configuración de perfil",
    name: "Nombre",
    email: "Correo",
    saveProfile: "Guardar perfil",
    preferences: "Preferencias",
    defaultCurrency: "Divisa por defecto",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    language: "Idioma",
    emailNotifications: "Notificaciones por correo",
    expenseAlerts: "Alertas cuando me asignen un gasto",
    savePreferences: "Guardar preferencias",
    dangerZone: "Zona de peligro",
    deleteAccount: "Eliminar mi cuenta",
    groupsEmpty: "Aún no tienes grupos. ¡Crea uno para empezar a compartir gastos!",
    createFirstGroup: "Crear mi primer grupo",
    addExpense: "Agregar gasto",
    expenses: "Gastos",
    balances: "Saldos",
    paidBy: "Pagado por",
    splitAmong: "Dividido entre",
    createdAt: "Creado el",
    noExpensesYet: "Aún no hay gastos.",
    back: "← Volver",
  },
  en: {
    home: "Home",
    groups: "Groups",
    summary: "Summary",
    settings: "Settings",
    myDashboard: "My Dashboard",
    logout: "Log out",
    welcome: "Welcome",
    preferencesSaved: "Preferences saved",
    profileSettings: "Profile settings",
    name: "Name",
    email: "Email",
    saveProfile: "Save profile",
    preferences: "Preferences",
    defaultCurrency: "Default currency",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    language: "Language",
    emailNotifications: "Email notifications",
    expenseAlerts: "Alerts when I'm assigned an expense",
    savePreferences: "Save preferences",
    dangerZone: "Danger zone",
    deleteAccount: "Delete my account",
    groupsEmpty: "You have no groups yet. Create one to start sharing!",
    createFirstGroup: "Create my first group",
    addExpense: "Add expense",
    expenses: "Expenses",
    balances: "Balances",
    paidBy: "Paid by",
    splitAmong: "Split among",
    createdAt: "Created at",
    noExpensesYet: "No expenses yet.",
    back: "← Back",
  },
};

const getInitialLang = () => {
  const saved = localStorage.getItem("language");
  if (saved === "es" || saved === "en") return saved;
  return "es";
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang());

  useEffect(() => {
    document.documentElement.setAttribute("lang", LOCALES[lang] || "es-ES");
    localStorage.setItem("language", lang);
  }, [lang]);

  const t = (key) => dict[lang]?.[key] ?? key;
  const locale = LOCALES[lang] || "es-ES";

  const value = useMemo(() => ({ lang, setLang, t, locale }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
