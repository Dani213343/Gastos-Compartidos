// frontend/src/components/AlertsPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useI18n } from "../context/I18nContext";

const LOCALES = { es: "es-ES", en: "en-US" };
const sid = (v) => (v != null ? String(v) : "");

function daysDiff(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor(
    (new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / MS
  );
}

export default function AlertsPanel() {
  const { lang } = useI18n();
  const locale = LOCALES[lang] || "es-ES";
  const token = localStorage.getItem("token") || "";
  const me = sid(localStorage.getItem("userId"));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // {type:'owe'|'owed'|'dueSoon'|'overdue', ...}
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set()); // acordeones abiertos

  const t = useCallback(
    (k) => {
      const L = {
        title: { es: "Alertas y recordatorios", en: "Alerts & reminders" },
        youOwe: { es: "Debes pagar", en: "You owe" },
        theyOwe: { es: "Te deben", en: "They owe you" },
        dueSoon: { es: "Próximos vencimientos", en: "Due soon" },
        overdue: { es: "Vencido", en: "Overdue" },
        remindNow: { es: "Recordar ahora", en: "Nudge now" },
        schedule: { es: "Programar recordatorios", en: "Schedule reminders" },
        unschedule: { es: "Detener recordatorios", en: "Stop reminders" },
        markPaid: { es: "Marcar como pagado", en: "Mark as paid" },
        confirmPaid: {
          es: "¿Estás seguro de marcar esta deuda como pagada?",
          en: "Are you sure you want to mark this as paid?",
        },
        scheduledFor: {
          es: (s) => `⚙️ Recordatorio automático programado para ${s}`,
          en: (s) => `⚙️ Auto-reminder scheduled for ${s}`,
        },
        none: { es: "Sin alertas por ahora 🎉", en: "No alerts for now 🎉" },
        error: {
          es: "No se pudieron cargar las alertas",
          en: "Couldn’t load alerts",
        },
        with: { es: "Con", en: "With" },
        due: { es: "Vence", en: "Due" },
        amount: { es: "Monto", en: "Amount" },
        group: { es: "Grupo", en: "Group" },
        date: { es: "Fecha", en: "Date" },
        ctx: { es: "Contexto", en: "Context" },
        participants: { es: "participantes", en: "participants" },
      };
      const v = L[k];
      return typeof v === "function" ? v : (v || {})[lang] || k;
    },
    [lang]
  );

  // Carga “inteligente” de grupos para mapear id -> nombre
  const fetchGroupsMap = useCallback(
    async (neededGroupIds) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
      };

      let groups = [];
      try {
        const r1 = await fetch("/api/groups?mine=1", { headers });
        if (r1.ok) {
          groups = await r1.json();
        } else {
          const r2 = await fetch("/api/groups", { headers });
          if (r2.ok) groups = await r2.json();
        }
      } catch {
        /* noop */
      }

      const map = {};
      for (const g of Array.isArray(groups) ? groups : []) {
        const id = sid(g._id);
        if (id) map[id] = g.name || "";
      }
      for (const id of neededGroupIds) {
        if (!map[id]) map[id] = `Grupo ${id.slice(0, 6)}`;
      }
      return map;
    },
    [token]
  );

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
      };

      const [resPending, resOwed] = await Promise.all([
        fetch(`/api/expenses?mine=pending`, { headers }),
        fetch(`/api/expenses?mine=owed`, { headers }),
      ]);

      const dataPending = resPending.ok ? await resPending.json() : [];
      const dataOwed = resOwed.ok ? await resOwed.json() : [];

      const groupIds = new Set();
      const collectGroupId = (e) => {
        const id = sid(e.group?._id || e.group);
        if (id) groupIds.add(id);
      };
      (Array.isArray(dataPending) ? dataPending : []).forEach(collectGroupId);
      (Array.isArray(dataOwed) ? dataOwed : []).forEach(collectGroupId);

      const groupNameMap = await fetchGroupsMap(Array.from(groupIds));

      const now = new Date();
      const built = [];

      // 🟠 “Yo debo”
      for (const e of Array.isArray(dataPending) ? dataPending : []) {
        const amount = Number(e.amount || 0);
        const currency = e.currency || e.group?.currency || "COP";
        const title = e.title || e.description || "Gasto";
        const paidBy = sid(e.paidBy);
        const split = (e.splitAmong || e.participants || []).map(sid);
        const due = e.dueDate ? new Date(e.dueDate) : null;
        const gid = sid(e.group?._id || e.group);
        const groupName = e.group?.name || (gid ? groupNameMap[gid] : "");
        const share = split.length ? amount / split.length : 0;

        let type = "owe";
        if (due) {
          const d = daysDiff(due, now);
          if (d <= 0) type = "overdue";
          else if (d <= 2) type = "dueSoon";
        }

        built.push({
          type,
          amount: share,
          currency,
          title,
          counterpartyName: e.paidByName || e.paidByEmail || paidBy.slice(0, 6),
          dueDate: due,
          expenseId: e._id,
          groupName,
          raw: e,
        });
      }

      // 🟢 “Me deben” (yo pagué)
      for (const e of Array.isArray(dataOwed) ? dataOwed : []) {
        const amount = Number(e.amount || 0);
        const currency = e.currency || e.group?.currency || "COP";
        const title = e.title || e.description || "Gasto";
        const split = (e.splitAmong || e.participants || []).map(sid);
        const due = e.dueDate ? new Date(e.dueDate) : null;
        const gid = sid(e.group?._id || e.group);
        const groupName = e.group?.name || (gid ? groupNameMap[gid] : "");

        const shareMine = split.includes(me) && split.length ? amount / split.length : 0;
        const totalToMe = amount - shareMine;
        if (totalToMe <= 0) continue;

        let type = "owed";
        if (due) {
          const d = daysDiff(due, now);
          if (d <= 0) type = "overdue";
          else if (d <= 2) type = "dueSoon";
        }

        built.push({
          type,
          amount: totalToMe,
          currency,
          title,
          counterpartyName:
            (e.splitEmails || []).join(", ") ||
            `${split.length} ${t("participants")}`,
          dueDate: due,
          expenseId: e._id,
          groupName,
          raw: e,
        });
      }

      const order = { overdue: 0, dueSoon: 1, owe: 2, owed: 3 };
      built.sort(
        (a, b) =>
          order[a.type] - order[b.type] ||
          new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      );

      setItems(built);
    } catch (e) {
      console.error(e);
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [token, me, t, fetchGroupsMap]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const h = () => fetchAlerts();
    window.addEventListener("expense:created", h);
    window.addEventListener("preferences:updated", h);
    window.addEventListener("alerts:refresh", h);
    return () => {
      window.removeEventListener("expense:created", h);
      window.removeEventListener("preferences:updated", h);
      window.removeEventListener("alerts:refresh", h);
    };
  }, [fetchAlerts]);

  const formatMoney = (n, curr) =>
    `${curr} ${Number(n || 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const section = useMemo(() => {
    return {
      overdue: {
        title: t("overdue"),
        bg: "bg-rose-50 dark:bg-rose-900/20",
        tag: "text-rose-700 dark:text-rose-300",
      },
      dueSoon: {
        title: t("dueSoon"),
        bg: "bg-amber-50 dark:bg-amber-900/20",
        tag: "text-amber-700 dark:text-amber-300",
      },
      owe: {
        title: t("youOwe"),
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
        tag: "text-indigo-700 dark:text-indigo-300",
      },
      owed: {
        title: t("theyOwe"),
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        tag: "text-emerald-700 dark:text-emerald-300",
      },
    };
  }, [t]);

  const grouped = useMemo(() => {
    const g = { overdue: [], dueSoon: [], owe: [], owed: [] };
    for (const it of items) g[it.type]?.push(it);
    return g;
  }, [items]);

  const nudge = async (expenseId) => {
    try {
      const res = await fetch(`/api/alerts/nudge/${expenseId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
      });
      if (!res.ok) throw new Error();
      alert(lang === "en" ? "Nudge sent" : "Recordatorio enviado");
    } catch {
      alert(lang === "en" ? "Could not send nudge" : "No se pudo enviar el recordatorio");
    }
  };

  // Prompt configurable: hour (HH:mm) y frecuencia (daily/weekly)
  const schedule = async (expenseId) => {
    try {
      const defaultTime = "09:00";
      const timeStr = (window.prompt(
        lang === "en"
          ? "At what time? (HH:mm)"
          : "¿A qué hora? (HH:mm)",
        defaultTime
      ) || defaultTime).trim();

      const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
      const isValidTime =
        Number.isInteger(hh) &&
        Number.isInteger(mm) &&
        hh >= 0 &&
        hh < 24 &&
        mm >= 0 &&
        mm < 60;

      const freq = (window.prompt(
        lang === "en"
          ? 'Frequency? Type "daily" or "weekly"'
          : 'Frecuencia: escribe "daily" o "weekly"',
        "daily"
      ) || "daily")
        .toLowerCase()
        .trim();

      if (!isValidTime || !["daily", "weekly"].includes(freq)) {
        alert(lang === "en" ? "Invalid inputs" : "Entradas inválidas");
        return;
      }

      // calcula la próxima ocurrencia (mañana a hh:mm)
      const now = new Date();
      const next = new Date(now);
      next.setDate(now.getDate() + 1);
      next.setHours(hh, mm, 0, 0);

      const headers = {
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
        "Content-Type": "application/json",
      };
      const body = JSON.stringify({ hour: hh, minute: mm, freq });
      const res = await fetch(`/api/alerts/schedule/${expenseId}`, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) throw new Error();

      const nice =
        lang === "en"
          ? next.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " tomorrow"
          : `mañana a las ${next.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}`;
      alert(t("scheduledFor")(nice));
    } catch {
      alert(lang === "en" ? "Operation failed" : "No se pudo completar la operación");
    }
  };

  const unschedule = async (expenseId) => {
    try {
      const res = await fetch(`/api/alerts/schedule/${expenseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
      });
      if (!res.ok) throw new Error();
      alert(lang === "en" ? "Reminders stopped" : "Recordatorios detenidos");
    } catch {
      alert(lang === "en" ? "Operation failed" : "No se pudo completar la operación");
    }
  };

  // Marca como pagado con confirmación y fallback de endpoint
  const markAsPaid = async (expenseId) => {
    const ok = window.confirm(t("confirmPaid"));
    if (!ok) return;

    // Optimista: quita del panel ya
    const prev = items.slice();
    setItems((cur) => cur.filter((x) => x.expenseId !== expenseId));

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
        "Content-Type": "application/json",
      };

      // intento 1: endpoint dedicado
      let res = await fetch(`/api/expenses/${expenseId}/settle`, {
        method: "POST",
        headers,
      });

      // intento 2: fallback PATCH con acción
      if (!res.ok) {
        res = await fetch(`/api/expenses/${expenseId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ action: "settle" }),
        });
      }
      if (!res.ok) throw new Error();

      window.dispatchEvent(new Event("alerts:refresh"));
    } catch {
      // rollback si falla
      setItems(prev);
      alert(lang === "en" ? "Could not mark as paid" : "No se pudo marcar como pagado");
    }
  };

  const toggleRow = (id) => {
    setExpanded((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onKeyToggle = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRow(id);
    }
  };

  return (
    <section className="mb-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t("title")}
      </h3>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">…</div>
      ) : error ? (
        <div className="text-rose-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">{t("none")}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {["overdue", "dueSoon", "owe", "owed"].map((k) =>
            grouped[k].length ? (
              <div
                key={k}
                className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${section[k].bg}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-semibold ${section[k].tag}`}>
                    {section[k].title}
                  </span>
                </div>
                <ul className="space-y-3">
                  {grouped[k].map((it) => {
                    const isOpen = expanded.has(it.expenseId);
                    return (
                      <li
                        key={it.expenseId}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        {/* Cabecera clickable (acordeón) */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          onClick={() => toggleRow(it.expenseId)}
                          onKeyDown={(e) => onKeyToggle(e, it.expenseId)}
                          className="p-3 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {it.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              {it.groupName && (
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                  {it.groupName}
                                </span>
                              )}
                              {it.groupName ? " • " : ""}
                              {t("with")} {it.counterpartyName}
                              {it.dueDate
                                ? ` • ${t("due")}: ${formatDate(it.dueDate)}`
                                : ""}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {formatMoney(it.amount, it.currency)}
                          </p>
                        </div>

                        {/* Cuerpo del acordeón */}
                        {isOpen && (
                          <div className="px-3 pb-3 mt-[-6px]">
                            <div className="text-sm text-gray-600 dark:text-gray-300 grid md:grid-cols-2 gap-2 mb-3">
                              <div>
                                <span className="font-semibold">{t("amount")}:</span>{" "}
                                {formatMoney(it.amount, it.currency)}
                              </div>
                              <div>
                                <span className="font-semibold">{t("group")}:</span>{" "}
                                {it.groupName || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">{t("date")}:</span>{" "}
                                {it.dueDate ? formatDate(it.dueDate) : "—"}
                              </div>
                              <div>
                                <span className="font-semibold">{t("ctx")}:</span>{" "}
                                {it.counterpartyName}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(k === "owed" || k === "dueSoon" || k === "overdue") && (
                                <>
                                  <button
                                    onClick={() => nudge(it.expenseId)}
                                    className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                                  >
                                    {t("remindNow")}
                                  </button>
                                  <button
                                    onClick={() => schedule(it.expenseId)}
                                    className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    {t("schedule")}
                                  </button>
                                  <button
                                    onClick={() => unschedule(it.expenseId)}
                                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                                  >
                                    {t("unschedule")}
                                  </button>
                                </>
                              )}

                              {/* “Marcar como pagado” disponible para pendientes/debo y vencidos */}
                              {(k === "owe" || k === "dueSoon" || k === "overdue") && (
                                <button
                                  onClick={() => markAsPaid(it.expenseId)}
                                  className="text-xs px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                  {t("markPaid")}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null
          )}
        </div>
      )}
    </section>
  );
}
