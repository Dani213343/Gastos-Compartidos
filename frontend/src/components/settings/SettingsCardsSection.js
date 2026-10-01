import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";

const safeGet = (key, fallback = "") => {
  const v = localStorage.getItem(key);
  if (!v || v === "undefined" || v === "null") return fallback;
  return v;
};

const SettingsCardsSection = () => {
  const { lang } = useI18n();

  const t = useCallback(
    (es, en) => (lang === "en" ? en : es),
    [lang]
  );

  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({
    cardholder: "",
    number: "",
    expMonth: "",
    expYear: "",
    cvc: "",
  });
  const [previewActive, setPreviewActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () => safeGet("token", "");

  // ========= Cargar tarjetas =========
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError(
        t(
          "Vuelve a iniciar sesión para gestionar tus tarjetas simuladas.",
          "Please log in again to manage your simulated cards."
        )
      );
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/cards", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-auth-token": token,
          },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(
            data?.msg ||
              t("No se pudieron cargar las tarjetas.", "Could not load cards.")
          );
          setCards([]);
          return;
        }

        setCards(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando tarjetas", err);
        setError(t("Error cargando tarjetas.", "Error loading cards."));
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  // ========= Manejo de inputs =========
  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;

    if (["number", "expMonth", "expYear", "cvc"].includes(name)) {
      v = v.replace(/\D/g, "");
    }
    if (name === "cardholder") {
      v = v.toUpperCase();
    }

    setForm((prev) => ({ ...prev, [name]: v }));
  };

  // ========= Enviar tarjeta =========
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();

    if (!token) {
      alert(
        t(
          "Tu sesión ha expirado. Vuelve a iniciar sesión.",
          "Your session has expired. Please log in again."
        )
      );
      return;
    }

    const month = Number(form.expMonth);
    const year = Number(form.expYear);

    if (!month || month < 1 || month > 12) {
      alert(
        t(
          "El mes de expiración debe estar entre 01 y 12.",
          "Expiration month must be between 01 and 12."
        )
      );
      return;
    }

    if (!year || year < 0) {
      alert(
        t(
          "Ingresa un año de expiración válido.",
          "Enter a valid expiration year."
        )
      );
      return;
    }

    if (!form.cardholder.trim()) {
      alert(
        t(
          "Ingresa el nombre del titular.",
          "Please enter the cardholder name."
        )
      );
      return;
    }

    if (!form.number || form.number.length < 4) {
      alert(
        t(
          "Ingresa al menos los últimos 4 dígitos de la tarjeta (simulada).",
          "Enter at least the last 4 digits of the (simulated) card."
        )
      );
      return;
    }

    const payload = {
      cardholder: form.cardholder.trim(),
      last4: form.number.slice(-4),
      expMonth: month,
      expYear: year,
      brand: "OTRA",
    };

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(
          data?.msg ||
            t("Error al guardar la tarjeta.", "Error saving card.")
        );
        return;
      }

      alert(t("Tarjeta simulada guardada.", "Simulated card saved."));

      setForm({
        cardholder: "",
        number: "",
        expMonth: "",
        expYear: "",
        cvc: "",
      });

      // recargar lista
      const reload = await fetch("/api/cards", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
      });

      const newData = await reload.json().catch(() => null);
      setCards(Array.isArray(newData) ? newData : []);
    } catch (err) {
      console.error("Error creando tarjeta", err);
      alert(
        t(
          "Error creando tarjeta simulada.",
          "Error creating simulated card."
        )
      );
    }
  };

  // ========= Eliminar tarjeta =========
  const handleDelete = async (cardId) => {
    const token = getToken();
    if (!token) {
      alert(
        t(
          "Tu sesión ha expirado. Vuelve a iniciar sesión.",
          "Your session has expired. Please log in again."
        )
      );
      return;
    }

    const confirmed = window.confirm(
      t(
        "¿Seguro que deseas eliminar esta tarjeta simulada?",
        "Are you sure you want to delete this simulated card?"
      )
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(
          data?.msg ||
            t("No se pudo eliminar la tarjeta.", "Could not delete the card.")
        );
        return;
      }

      // Actualizar estado local
      setCards((prev) => prev.filter((c) => c._id !== cardId));
      alert(t("Tarjeta eliminada.", "Card deleted."));
    } catch (err) {
      console.error("Error eliminando tarjeta", err);
      alert(
        t(
          "Error al eliminar la tarjeta.",
          "Error while deleting the card."
        )
      );
    }
  };

  // ========= UI =========
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
        {t("Métodos de pago (simulados)", "Payment methods (simulated)")}
      </h3>

      {/* PREVIEW */}
      <div
        className="w-full max-w-md mx-auto mb-8 transform transition duration-300"
        onMouseEnter={() => setPreviewActive(true)}
        onMouseLeave={() => setPreviewActive(false)}
      >
        <div
          className={`rounded-3xl p-6 text-white shadow-lg ${
            previewActive
              ? "scale-105 bg-gradient-to-r from-violet-600 to-pink-500"
              : "bg-gradient-to-r from-indigo-600 to-purple-600"
          }`}
        >
          <div className="text-xl tracking-widest mb-6">
            {form.number
              ? form.number.replace(/(.{4})/g, "$1 ").trim()
              : "0000 0000 0000 0000"}
          </div>

          <div className="flex justify-between mt-10">
            <div>
              <p className="text-xs opacity-70">{t("TITULAR", "CARDHOLDER")}</p>
              <p className="font-semibold text-lg">
                {form.cardholder || "JHON DOE"}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">{t("VENCE", "EXPIRES")}</p>
              <p className="font-semibold text-lg">
                {(form.expMonth || "MM")}/{form.expYear || "YY"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            {t("Nombre del titular", "Cardholder name")}
          </label>
          <input
            name="cardholder"
            className="w-full mt-1 p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
            value={form.cardholder}
            onChange={handleChange}
            placeholder="JHON DOE"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            {t("Número de tarjeta (simulado)", "Card number (simulated)")}
          </label>
          <input
            name="number"
            maxLength={16}
            className="w-full mt-1 p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
            value={form.number}
            onChange={handleChange}
            placeholder="0000 0000 0000 0000"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            {t("Mes", "Month")}
          </label>
          <input
            name="expMonth"
            maxLength={2}
            className="w-full mt-1 p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
            value={form.expMonth}
            onChange={handleChange}
            placeholder="MM"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            {t("Año", "Year")}
          </label>
          <input
            name="expYear"
            maxLength={2}
            className="w-full mt-1 p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
            value={form.expYear}
            onChange={handleChange}
            placeholder="YY"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            CVC
          </label>
          <input
            name="cvc"
            maxLength={3}
            className="w-full mt-1 p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
            value={form.cvc}
            onChange={handleChange}
            placeholder="000"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg mt-4 disabled:opacity-60"
            disabled={!getToken()}
          >
            {t("Guardar tarjeta simulada", "Save simulated card")}
          </button>
        </div>
      </form>

      {/* LISTA DE TARJETAS */}
      <h4 className="text-md font-semibold text-indigo-600 dark:text-indigo-300 mb-3">
        {t("Tarjetas guardadas", "Saved cards")}
      </h4>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">
            {t("Cargando tarjetas…", "Loading cards…")}
          </p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-gray-500">
            {t(
              "Aún no has agregado tarjetas simuladas.",
              "You have no simulated cards yet."
            )}
          </p>
        ) : (
          cards.map((c) => (
            <div
              key={c._id}
              className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg shadow flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">
                  {c.cardholder || "SIMULATED CARD"}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  **** **** **** {c.last4 || "0000"}
                </p>
                <p className="text-xs opacity-70">
                  {t("Expira", "Expires")}: {c.expMonth}/{c.expYear}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(c._id)}
                className="px-3 py-2 text-sm rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
              >
                {t("Eliminar", "Delete")}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default SettingsCardsSection;
