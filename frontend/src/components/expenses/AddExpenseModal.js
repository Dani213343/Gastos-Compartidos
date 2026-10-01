// frontend/src/components/expenses/AddExpenseModal.jsx
import React, { useMemo, useState, useEffect } from "react";

const DEFAULT_CATEGORIES = [
  "Comida y bebida",
  "Transporte",
  "Alojamiento",
  "Entretenimiento",
  "Mercado",
  "Otro",
];

// === Zona horaria fija para Colombia (Bogotá) ===
const CO_TZ = "America/Bogota";

// yyyy-mm-dd calculado en Bogotá (evita desfases)
const todayYMD_CO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Sanitiza el input de monto
const toMoney = (v) =>
  String(v)
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");

export default function AddExpenseModal({
  open,
  onClose,
  group,      // objeto del grupo con members, currency, _id
  token,      // JWT
  onCreated,  // callback(expense) cuando se crea con éxito
}) {
  const [title, setTitle] = useState("");
  const [categoryMode, setCategoryMode] = useState("preset"); // 'preset' | 'custom'
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(group?.currency || "COP");
  const [paidBy, setPaidBy] = useState(null);

  // ⚠️ Fechas
  const [date, setDate] = useState(todayYMD_CO());           // fecha del gasto
  const [selectedDueDate, setSelectedDueDate] = useState(""); // fecha límite (opcional)

  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Inicializa valores cuando se abre
  useEffect(() => {
    if (!open || !group) return;
    setTitle("");
    setCategoryMode("preset");
    setCategory("");
    setCustomCategory("");
    setAmount("");
    setCurrency(group.currency || "COP");

    const firstMemberId = group.members?.[0]?._id || null;
    setPaidBy(firstMemberId);

    const initSel = {};
    (group.members || []).forEach((m) => (initSel[m._id] = true));
    setSelected(initSel);

    // fechas
    setDate(todayYMD_CO());
    setSelectedDueDate("");

    setErr("");
    setSaving(false);
  }, [open, group]);

  const members = group?.members || [];
  const parsedAmount = useMemo(() => Number(toMoney(amount) || 0), [amount]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const canSave =
    !!title.trim() &&
    parsedAmount > 0 &&
    !!paidBy &&
    selectedIds.length > 0 &&
    !!currency &&
    !!date;

  const handleToggleMember = (id) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSelectAll = (checked) => {
    const next = {};
    members.forEach((m) => (next[m._id] = !!checked));
    setSelected(next);
  };

  const effectiveCategory =
    categoryMode === "preset"
      ? category || ""
      : customCategory.trim() || "";

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setErr("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-auth-token": token,
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: parsedAmount,
          group: group._id,
          paidBy,
          splitAmong: selectedIds,
          currency: group.currency, // puedes usar `currency` si quieres permitir cambio por gasto
          category: effectiveCategory || "Otro",
          // Enviamos YYYY-MM-DD (no toISOString)
          date,
          notes: "",
          // NUEVO: fecha límite opcional (YYYY-MM-DD). Si tu backend quiere ISO, conviértelo antes.
          dueDate: selectedDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.msg || "No se pudo crear el gasto");
        setSaving(false);
        return;
      }

      // Ok
      if (typeof onCreated === "function") onCreated(data.expense);
      // 🔔 Notificar a panel de alertas / listeners globales
      window.dispatchEvent(new Event("expense:created"));
      onClose();
    } catch (e) {
      console.error(e);
      setErr("Error de red");
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Agregar gasto</h3>
          <button
            disabled={saving}
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>

        {err && (
          <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
            {err}
          </div>
        )}

        {/* Título */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Ej. Almuerzo, Taxi, Hotel…"
          />
        </div>

        {/* Categoría + Monto/Moneda */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="catmode"
                  checked={categoryMode === "preset"}
                  onChange={() => setCategoryMode("preset")}
                />
                Lista
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="catmode"
                  checked={categoryMode === "custom"}
                  onChange={() => setCategoryMode("custom")}
                />
                Personalizada
              </label>
            </div>

            {categoryMode === "preset" ? (
              <select
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Escribe la categoría…"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}
          </div>

          {/* Monto / Moneda */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Monto
            </label>
            <div className="mt-1 flex gap-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0.00"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2"
              >
                {["COP", "USD", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {parsedAmount <= 0 && (
              <p className="text-xs text-rose-600 mt-1">
                Ingresa un monto válido &gt; 0
              </p>
            )}
          </div>
        </div>

        {/* Pagado por / Fecha del gasto */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pagado por
            </label>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={paidBy || ""}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha
            </label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Fecha límite (opcional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Fecha límite (opcional)
          </label>
          <input
            type="date"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            value={selectedDueDate}
            onChange={(e) => setSelectedDueDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Si la estableces, se podrán generar recordatorios y alertas de vencimiento.
          </p>
        </div>

        {/* Participantes */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Dividir entre
            </label>
            <div className="text-sm text-gray-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={members.every((m) => selected[m._id])}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                Seleccionar todos
              </label>
            </div>
          </div>

          <div className="mt-2 grid md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {members.map((m) => (
              <label
                key={m._id}
                className="inline-flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={!!selected[m._id]}
                  onChange={() => handleToggleMember(m._id)}
                />
                {m.name || m.email}
              </label>
            ))}
          </div>

          {selectedIds.length === 0 && (
            <p className="text-xs text-rose-600 mt-1">
              Selecciona al menos un participante
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            disabled={!canSave || saving}
            onClick={submit}
            className={`px-4 py-2 rounded-lg text-white ${
              canSave ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400"
            }`}
          >
            {saving ? "Guardando…" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
