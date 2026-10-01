import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AddExpenseModal from "./expenses/AddExpenseModal";
import { FiTrash2 } from "react-icons/fi";
import { useI18n } from "../context/I18nContext";

// Locales por idioma
const LOCALES = {
  es: "es-ES",
  en: "en-US",
};

// Etiquetas de divisa por idioma
const currencyLabel = (c, lang = "es") => {
  const mapES = { COP: "Peso colombiano", USD: "Dólar (USD)", EUR: "Euro (EUR)" };
  const mapEN = { COP: "Colombian Peso", USD: "US Dollar (USD)", EUR: "Euro (EUR)" };
  return (lang === "en" ? mapEN : mapES)[c] || c;
};

// Dinero según locale
const fmtMoney = (n, locale = "es-ES") =>
  (typeof n === "number" ? n : Number(n || 0)).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CO_TZ = "America/Bogota";
const DIAN_SEARCH_URL = "https://catalogo-vpfe.dian.gov.co/User/SearchDocument";

// yyyy-mm-dd en TZ
const ymdTZ = (value, tz = CO_TZ) => {
  const dt = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(dt)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Fecha y hora legibles según locale
const fmtDateTime = (value, locale = "es-ES", tz = CO_TZ) => {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

const sid = (v) => (v != null ? String(v) : "");

const makeFinders = (group) => {
  const members = group?.members || [];
  const byId = (id) => members.find((m) => sid(m._id) === sid(id));
  const label = (id) => {
    const m = byId(id);
    return m?.name || m?.email || sid(id).slice(0, 6);
  };
  return { byId, label };
};

function computeBalances(expenses, members) {
  const map = Object.fromEntries((members || []).map((m) => [sid(m._id), 0]));
  for (const e of expenses) {
    const amount = Number(e.amount || 0);
    const included = (e.splitAmong || e.participants || []).map(sid).filter(Boolean);
    if (!amount || included.length === 0) continue;

    const share = amount / included.length;
    for (const pid of included) {
      if (map[pid] === undefined) map[pid] = 0;
      map[pid] -= share;
    }

    const payer = sid(e.paidBy);
    if (payer) {
      if (map[payer] === undefined) map[payer] = 0;
      map[payer] += amount;
    }
  }
  return map;
}

export default function GroupDetail() {
  const { lang } = useI18n(); // 'es' | 'en'
  const locale = LOCALES[lang] || "es-ES";

  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // para volver a la lista

  const token = localStorage.getItem("token");
  const userId = sid(localStorage.getItem("userId"));

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // 🧾 Facturas
  const [invoices, setInvoices] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");

  const [tab, setTab] = useState("gastos");
  const [addOpen, setAddOpen] = useState(false);

  const isAdminLike = (g, uid) =>
    sid(g?.owner) === sid(uid) || (g?.admins || []).map(sid).includes(sid(uid));

  const mayDeleteAtClient = (g, e, uid) =>
    isAdminLike(g, uid) || sid(e?.createdBy) === sid(uid) || sid(e?.paidBy) === sid(uid);

  // 🔄 helper para recargar facturas
  const refreshInvoices = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(data.invoices || data || []);
    } catch (err) {
      console.error("Error cargando facturas:", err);
    }
  };

  useEffect(() => {
    (async () => {
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      setLoading(true);
      setErrorMsg("");
      try {
        const gRes = await fetch(`/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
        });
        const gData = await gRes.json();

        if (gRes.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!gRes.ok) {
          setErrorMsg(
            gData?.msg ||
              (lang === "en" ? "Could not load the group" : "No se pudo cargar el grupo")
          );
          setLoading(false);
          return;
        }

        setGroup(gData);

        let exps = [];
        const eRes = await fetch(`/api/expenses?group=${groupId}`, {
          headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
        });
        if (eRes.ok) {
          const eData = await eRes.json();
          exps = Array.isArray(eData) ? eData : [];
        }

        exps = exps
          .map((e) => ({
            ...e,
            date: e.date || e.createdAt || new Date(),
            createdAt: e.createdAt || new Date(),
            allDay: !!e.allDay,
            splitAmong: (e.splitAmong || e.participants || []).map(sid),
            paidBy: sid(e.paidBy),
            createdBy: sid(e.createdBy),
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setExpenses(exps);

        // 🔄 cargar facturas del grupo
        await refreshInvoices();

        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg(lang === "en" ? "Network error" : "Error de red");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, token, navigate, lang]);

  // Volver “inteligente”
  const goBackSmart = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    navigate("/client-dashboard/groups");
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm(lang === "en" ? "Delete this expense?" : "¿Eliminar este gasto?"))
      return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-auth-token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          data?.msg ||
            (lang === "en" ? "Could not delete the expense" : "No se pudo eliminar el gasto")
        );
        return;
      }
      setExpenses((prev) => prev.filter((e) => sid(e._id) !== sid(expenseId)));
    } catch (err) {
      console.error("Error eliminando gasto:", err);
      alert(lang === "en" ? "Network error" : "Error de red");
    }
  };

  // 🧾 Subir XML de factura
  const handleInvoiceUpload = async (e) => {
    e.preventDefault();
    if (!invoiceFile) {
      setInvoiceError(
        lang === "en" ? "Select an XML file first." : "Selecciona un archivo XML primero."
      );
      return;
    }

    try {
      setInvoiceLoading(true);
      setInvoiceError("");
      setInvoiceSuccess("");

      const formData = new FormData();
      formData.append("invoiceXml", invoiceFile);

      const res = await fetch(`/api/groups/${groupId}/invoices/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.msg ||
            (lang === "en" ? "Error uploading invoice" : "Error subiendo factura")
        );
      }

      setInvoiceSuccess(
        lang === "en" ? "Invoice uploaded successfully." : "Factura subida correctamente."
      );
      setInvoiceFile(null);
      await refreshInvoices();
    } catch (err) {
      console.error("Error subiendo factura:", err);
      setInvoiceError(err.message || (lang === "en" ? "Upload error" : "Error de carga"));
    } finally {
      setInvoiceLoading(false);
    }
  };

  // 🧾 Verificar (marcar como revisada manualmente)
  const handleVerifyInvoice = async (invoiceId) => {
    try {
      setInvoiceLoading(true);
      setInvoiceError("");
      setInvoiceSuccess("");

      const res = await fetch(`/api/invoices/${invoiceId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.msg ||
            (lang === "en"
              ? "Error verifying invoice"
              : "Error verificando factura")
        );
      }

      await refreshInvoices();
      setInvoiceSuccess(
        lang === "en"
          ? "Invoice marked as manually reviewed."
          : "Factura marcada como revisada manualmente."
      );
    } catch (err) {
      console.error("Error verificando factura:", err);
      setInvoiceError(
        err.message ||
          (lang === "en"
            ? "Verification error"
            : "Error al verificar la factura")
      );
    } finally {
      setInvoiceLoading(false);
    }
  };

    // 🧾 Eliminar factura
  const handleDeleteInvoice = async (invoiceId) => {
    if (
      !window.confirm(
        lang === "en"
          ? "Delete this invoice?"
          : "¿Eliminar esta factura?"
      )
    )
      return;

    try {
      setInvoiceLoading(true);
      setInvoiceError("");
      setInvoiceSuccess("");

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.msg ||
            (lang === "en"
              ? "Error deleting invoice"
              : "Error eliminando factura")
        );
      }

      // Quitarla del estado local
      setInvoices((prev) =>
        prev.filter((inv) => sid(inv._id) !== sid(invoiceId))
      );

      setInvoiceSuccess(
        lang === "en"
          ? "Invoice deleted successfully."
          : "Factura eliminada correctamente."
      );
    } catch (err) {
      console.error("Error eliminando factura:", err);
      setInvoiceError(
        err.message ||
          (lang === "en"
            ? "Delete error"
            : "Error al eliminar la factura")
      );
    } finally {
      setInvoiceLoading(false);
    }
  };


  // 🧾 Copiar CUFE al portapapeles
  const handleCopyCufe = async (cufe) => {
    try {
      if (!cufe) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cufe);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = cufe;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setInvoiceSuccess(
        lang === "en"
          ? "CUFE copied to clipboard."
          : "CUFE copiado al portapapeles."
      );
      setInvoiceError("");
    } catch (err) {
      console.error("Error copiando CUFE:", err);
      setInvoiceError(
        lang === "en"
          ? "Could not copy CUFE."
          : "No se pudo copiar el CUFE."
      );
    }
  };

  const groupedByDate = useMemo(() => {
    const map = {};
    for (const e of expenses) {
      const key = ymdTZ(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return Object.fromEntries(
      Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]))
    );
  }, [expenses]);

  const balances = useMemo(
    () => (group ? computeBalances(expenses, group.members || []) : {}),
    [expenses, group]
  );

  const { label: memberLabel } = makeFinders(group);

  if (loading)
    return (
      <div className="p-6 dark:text-gray-100">
        {lang === "en" ? "Loading…" : "Cargando…"}
      </div>
    );

  if (errorMsg) {
    return (
      <div className="p-6 dark:text-gray-100">
        <button
          onClick={goBackSmart}
          className="mb-4 text-indigo-600 dark:text-indigo-300 hover:underline"
        >
          ← {lang === "en" ? "Back" : "Volver"}
        </button>
        <p className="text-rose-600">{errorMsg}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 dark:text-gray-100">
        <button
          onClick={goBackSmart}
          className="mb-4 text-indigo-600 dark:text-indigo-300 hover:underline"
        >
          ← {lang === "en" ? "Back" : "Volver"}
        </button>
        <p className="text-rose-600">
          {lang === "en" ? "Group not found." : "No se encontró el grupo."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={goBackSmart}
        className="mb-4 text-indigo-600 dark:text-indigo-300 hover:underline"
      >
        ← {lang === "en" ? "Back" : "Volver"}
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {group.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currencyLabel(group.currency || "COP", lang)} •{" "}
            {group.members?.length || 0}{" "}
            {lang === "en" ? "members" : "miembros"}
          </p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {lang === "en" ? "Add expense" : "Agregar gasto"}
        </button>
      </div>

      <div className="mt-6 border-b flex gap-6 border-gray-200 dark:border-gray-700">
        {["gastos", "saldos", "facturas"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 -mb-px ${
              tab === t
                ? "border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t === "gastos"
              ? lang === "en"
                ? "Expenses"
                : "Gastos"
              : t === "saldos"
              ? lang === "en"
                ? "Balances"
                : "Saldos"
              : lang === "en"
              ? "Invoices"
              : "Facturas"}
          </button>
        ))}
      </div>

      {tab === "gastos" && (
        <div className="mt-6">
          {Object.keys(groupedByDate).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {lang === "en" ? "No expenses yet." : "Aún no hay gastos."}
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, items]) => (
                <div key={dateKey}>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    {(() => {
                      const [y, m, d] = dateKey.split("-").map(Number);
                      const local = new Date(y, m - 1, d);
                      return new Intl.DateTimeFormat(locale, {
                        timeZone: CO_TZ,
                        weekday: "long",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(local);
                    })()}
                  </h4>
                  <div className="space-y-2">
                    {items.map((e) => {
                      const looksAllowed = mayDeleteAtClient(group, e, userId);
                      return (
                        <details
                          key={e._id || e.id || `${dateKey}-${e.title}-${Math.random()}`}
                          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
                        >
                          <summary className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-800 dark:text-gray-100 font-medium">
                                {e.title}
                              </span>
                              {e.category && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                                  {e.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-800 dark:text-gray-100 font-semibold">
                                {e.currency || group.currency}{" "}
                                {fmtMoney(e.amount, locale)}
                              </span>
                              <button
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  ev.stopPropagation();
                                  handleDeleteExpense(e._id);
                                }}
                                className={`p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 ${
                                  looksAllowed
                                    ? "text-rose-600 hover:text-rose-700"
                                    : "text-rose-500/70 hover:text-rose-600"
                                }`}
                                title={
                                  lang === "en"
                                    ? "Delete expense"
                                    : "Eliminar gasto"
                                }
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </summary>
                          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                            <p>
                              {lang === "en" ? "Paid by" : "Pagado por"}:{" "}
                              <strong>{memberLabel(e.paidBy)}</strong>
                            </p>
                            <p>
                              {lang === "en"
                                ? "Split among"
                                : "Dividido entre"}
                              :{" "}
                              {(e.splitAmong || [])
                                .map(memberLabel)
                                .join(", ")}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-400">
                              {(lang === "en" ? "Created on" : "Creado el") +
                                ": "}
                              {fmtDateTime(e.createdAt, locale)}
                            </p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "saldos" && (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(group.members || []).map((m) => {
            const b = balances[sid(m._id)] || 0;
            return (
              <div
                key={m._id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <p className="text-gray-700 dark:text-gray-200 font-medium">
                  {m.name || m.email}{" "}
                  {sid(m._id) === sid(userId) ? (
                    <em className="text-xs">
                      {lang === "en" ? "(Me)" : "(Yo)"}
                    </em>
                  ) : null}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    b >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {(b >= 0
                    ? lang === "en"
                      ? "In favor"
                      : "A favor"
                    : lang === "en"
                    ? "Owes"
                    : "En contra") + ": "}
                  {(group.currency || "COP")}{" "}
                  {fmtMoney(Math.abs(b), locale)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "facturas" && (
        <div className="mt-6">
          <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {lang === "en"
                ? "Upload invoice (XML)"
                : "Subir factura (XML)"}
            </h3>

            <form
              onSubmit={handleInvoiceUpload}
              className="flex flex-col md:flex-row gap-3 items-center"
            >
              <input
                type="file"
                accept=".xml"
                onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <button
                type="submit"
                disabled={invoiceLoading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {invoiceLoading
                  ? lang === "en"
                    ? "Uploading..."
                    : "Cargando..."
                  : lang === "en"
                  ? "Upload invoice"
                  : "Subir factura"}
              </button>
            </form>

            {invoiceError && (
              <p className="mt-2 text-sm text-rose-600">{invoiceError}</p>
            )}
            {invoiceSuccess && (
              <p className="mt-2 text-sm text-emerald-600">
                {invoiceSuccess}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-x-auto">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
              {lang === "en"
                ? "Group invoices"
                : "Facturas del grupo"}
            </h3>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-3">
                    {lang === "en" ? "Number" : "Número"}
                  </th>
                  <th className="text-left py-2 pr-3">CUFE</th>
                  <th className="text-left py-2 pr-3">
                    {lang === "en" ? "Supplier" : "Proveedor"}
                  </th>
                  <th className="text-left py-2 pr-3">
                    {lang === "en" ? "Total" : "Total"}
                  </th>
                  <th className="text-left py-2 pr-3">
                    {lang === "en" ? "Status" : "Estado"}
                  </th>
                  <th className="text-left py-2 pr-3">
                    {lang === "en" ? "Actions" : "Acciones"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {lang === "en"
                        ? "No invoices yet."
                        : "Aún no hay facturas cargadas."}
                    </td>
                  </tr>
                )}

                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <td className="py-2 pr-3">{inv.number || "-"}</td>

                    {/* CUFE completo, en varias líneas, con tooltip */}
                    <td className="py-2 pr-3 align-top">
                      <div
                        className="text-[11px] font-mono break-all bg-slate-50 dark:bg-slate-900/40 px-2 py-1 rounded"
                        title={inv.cufe}
                      >
                        {inv.cufe}
                      </div>
                    </td>

                    <td className="py-2 pr-3">
                      {inv.issuerName || "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {inv.totalAmount != null
                        ? `${inv.currency || group.currency || "COP"} ${fmtMoney(
                            inv.totalAmount,
                            locale
                          )}`
                        : "-"}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inv.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-700"
                            : inv.status === "REJECTED"
                            ? "bg-rose-100 text-rose-700"
                            : inv.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : inv.status === "MANUAL_REVIEW"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {inv.status || "PENDING"}
                      </span>

                      {inv.verificationDetail && (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {inv.verificationDetail}
                        </p>
                      )}
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopyCufe(inv.cufe)}
                          className="px-3 py-1 rounded-md border text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {lang === "en" ? "Copy CUFE" : "Copiar CUFE"}
                        </button>

                        <button
                          onClick={() => handleVerifyInvoice(inv._id)}
                          disabled={
                            invoiceLoading || inv.status === "MANUAL_REVIEW"
                          }
                          className="px-3 py-1 rounded-md border text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          {inv.status === "MANUAL_REVIEW"
                            ? lang === "en"
                              ? "Reviewed"
                              : "Revisada"
                            : lang === "en"
                            ? "Mark as reviewed"
                            : "Marcar como revisada"}
                        </button>

                        <a
                          href={DIAN_SEARCH_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-md border text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 inline-block"
                        >
                          {lang === "en" ? "Open DIAN" : "Abrir DIAN"}
                        </a>

                        {/* 🗑 Botón eliminar factura */}
                        <button
                          onClick={() => handleDeleteInvoice(inv._id)}
                          disabled={invoiceLoading}
                          className="px-3 py-1 rounded-md border border-rose-300 text-xs text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50"
                        >
                          {lang === "en" ? "Delete" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        group={group}
        token={token}
        onCreated={(expense) => {
          setExpenses((prev) => {
            const next = [
              ...prev,
              {
                ...expense,
                paidBy: sid(expense.paidBy),
                splitAmong: (expense.splitAmong || []).map(sid),
                date: expense.date || expense.createdAt || new Date(),
                createdAt: expense.createdAt || new Date(),
                allDay: !!expense.allDay,
                createdBy: sid(expense.createdBy),
              },
            ].sort((a, b) => new Date(b.date) - new Date(a.date));
            return next;
          });
        }}
      />
    </div>
  );
}
