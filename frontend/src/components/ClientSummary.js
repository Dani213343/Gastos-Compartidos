// frontend/src/components/ClientSummary.jsx
import React, { useEffect, useMemo, useState } from "react";

const LOCALES = { es: "es-ES", en: "en-US" };

function sumAmounts(list) {
  return list.reduce((acc, e) => acc + Number(e.amount || 0), 0);
}

export default function ClientSummary({ userId, token }) {
  const lang = localStorage.getItem("lang") || "es";
  const locale = LOCALES[lang] || "es-ES";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState([]); // gastos donde YO debo (splitAmong me incluye y otro pagó)
  const [owed, setOwed] = useState([]);       // gastos que YO pagué (otros me deben)

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        };

        const [r1, r2] = await Promise.all([
          fetch("/api/expenses?mine=pending", { headers }),
          fetch("/api/expenses?mine=owed", { headers }),
        ]);

        if (!r1.ok && !r2.ok) {
          throw new Error("No se pudo cargar el resumen");
        }

        const p = r1.ok ? await r1.json() : [];
        const o = r2.ok ? await r2.json() : [];
        if (!alive) return;

        setPending(Array.isArray(p) ? p : []);
        setOwed(Array.isArray(o) ? o : []);
      } catch (e) {
        console.error(e);
        if (alive) setError(lang === "en" ? "Could not load summary" : "No se pudo cargar el resumen");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (token) load();
    else {
      setError(lang === "en" ? "Missing token" : "Falta token");
      setLoading(false);
    }
    return () => { alive = false; };
  }, [token, lang]);

  // Totales
  const totals = useMemo(() => {
    // pending: yo debo mi parte proporcional => amount / splitAmong.length
    const totalIOwe = (pending || []).reduce((acc, e) => {
      const split = Array.isArray(e.splitAmong) ? e.splitAmong : [];
      const share = split.length ? Number(e.amount || 0) / split.length : 0;
      return acc + share;
    }, 0);

    // owed: me deben = total - mi propia parte si yo también estoy en splitAmong
    const totalTheyOweMe = (owed || []).reduce((acc, e) => {
      const amount = Number(e.amount || 0);
      const split = Array.isArray(e.splitAmong) ? e.splitAmong.map(String) : [];
      const iAmIn = split.includes(String(userId));
      const shareMine = iAmIn && split.length ? amount / split.length : 0;
      return acc + (amount - shareMine);
    }, 0);

    return {
      totalIOwe,
      totalTheyOweMe,
      net: totalTheyOweMe - totalIOwe,
    };
  }, [pending, owed, userId]);

  // Próximos vencimientos (si tus gastos traen dueDate)
  const nextDue = useMemo(() => {
    const withDue = [...pending, ...owed].filter(e => !!e.dueDate);
    if (withDue.length === 0) return null;
    withDue.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return withDue[0];
  }, [pending, owed]);

  const money = (n, curr = "COP") =>
    `${curr} ${Number(n || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!userId) {
    return (
      <div className="text-gray-500">
        {lang === "en" ? "Waiting for user…" : "Esperando usuario…"}
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-500">{lang === "en" ? "Loading summary…" : "Cargando resumen…"}</div>;
  }

  if (error) {
    return <div className="text-rose-600">{error}</div>;
  }

  const currencyGuess =
    (pending[0]?.currency) ||
    (owed[0]?.currency) ||
    "COP";

  const netPositive = totals.net >= 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
        {lang === "en" ? "Financial summary" : "Resumen financiero principal"}
      </h3>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
            {lang === "en" ? "They owe you" : "Total que te deben"}
          </p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {money(totals.totalTheyOweMe, currencyGuess)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
            {lang === "en" ? "You owe" : "Total que debes"}
          </p>
          <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
            {money(totals.totalIOwe, currencyGuess)}
          </p>
        </div>

        <div className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${netPositive ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20"}`}>
          <p className={`text-sm font-semibold ${netPositive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
            {lang === "en" ? "Net balance" : "Balance neto"}
          </p>
          <p className={`text-2xl font-bold ${netPositive ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"}`}>
            {money(totals.net, currencyGuess)}
          </p>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {nextDue ? (
          <>
            <strong>{lang === "en" ? "Next due" : "Próximo vencimiento"}:</strong>{" "}
            {new Date(nextDue.dueDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })} — {nextDue.title}
          </>
        ) : (
          <>{lang === "en" ? "No upcoming due dates." : "Sin próximos vencimientos."}</>
        )}
      </div>
    </div>
  );
}
