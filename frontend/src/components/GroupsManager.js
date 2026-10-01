import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import GroupCard from "./GroupCard";
import { toId, getCurrentUserId } from "../utils/ids";
import { useI18n } from "../context/I18nContext";

// --- Helpers de emails y constantes ---
const parseEmails = (text) => {
  const parts = (text || "")
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return parts.filter((e) => emailRegex.test(e.toLowerCase()));
};

const CURRENCIES = [
  { code: "COP", label: "Peso colombiano" },
  { code: "USD", label: "Dólar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normalización para LISTADO: todo como ids string (sencillo/consistente)
const normalizeGroupList = (g) => ({
  ...g,
  owner: toId(g?.owner),
  admins: Array.isArray(g?.admins) ? g.admins.map(toId) : [],
  members: Array.isArray(g?.members) ? g.members.map(toId) : [],
});

// Normalización para DETALLE: respeta miembros populados con name/email
const normalizeGroupDetail = (g) => {
  const base = { ...g, owner: toId(g?.owner) };
  const admins = Array.isArray(g?.admins) ? g.admins.map(toId) : [];
  let members = [];
  if (Array.isArray(g?.members)) {
    members = g.members.map((m) => (typeof m === "object" ? m : toId(m)));
  }
  // 🔑 conservar el flag desde el backend
  return { ...base, admins, members, isAdmin: !!g.isAdmin };
};

const GroupsManager = () => {
  const { lang } = useI18n(); // 'es' | 'en'

  // Lee SIEMPRE desde localStorage (token más reciente)
  const tokenAtRender = localStorage.getItem("token") || "";
  const currentUserId = getCurrentUserId({
    userId: localStorage.getItem("userId") || "",
    token: tokenAtRender,
  });

  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [search, setSearch] = useState("");

  // Modal unificado: crear/editar
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formGroup, setFormGroup] = useState({
    name: "",
    description: "",
    currency: "COP",
    isFavorite: false,
  });

  // Participantes (solo visibles en modo CREAR)
  const [participants, setParticipants] = useState([
    { name: "", email: "", type: "Personal" },
  ]);

  // (Opcional) ver miembros / invitar
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersGroup, setMembersGroup] = useState(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForGroup, setInviteForGroup] = useState(null);
  const [emailsInput, setEmailsInput] = useState("");
  const [addResult, setAddResult] = useState(null);
  const emailsParsed = useMemo(() => parseEmails(emailsInput), [emailsInput]);

  // 🔹 NUEVO: Nuevos miembros al editar
  const [newMembersInput, setNewMembersInput] = useState("");
  const newMembersParsed = useMemo(
    () => parseEmails(newMembersInput),
    [newMembersInput]
  );

  // --- Cargar grupos ---
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const freshToken = localStorage.getItem("token") || "";
        const res = await fetch("/api/groups", {
          headers: {
            Authorization: `Bearer ${freshToken}`,
            "x-auth-token": freshToken,
          },
        });

        if (res.status === 401) {
          // No borres todo; elimina solo el token y regresa a login
          localStorage.removeItem("token");
          navigate("/login", {
            replace: true,
            state: { from: "/client-dashboard/groups" },
          });
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        // Normaliza cada grupo del listado
        const normalizedList = list.map(normalizeGroupList);

        setGroups(normalizedList);
        setFilteredGroups(normalizedList);
      } catch (err) {
        console.error("Error cargando grupos:", err);
      }
    };

    fetchGroups();
    // No dependas de `token` de props; al entrar a la ruta se monta de nuevo
  }, [navigate]);

  // --- Filtro ---
  useEffect(() => {
    const q = (search || "").toLowerCase();
    setFilteredGroups(groups.filter((g) => g?.name?.toLowerCase().includes(q)));
  }, [search, groups]);

  // --- Helpers participantes (solo crear) ---
  const addParticipantRow = () =>
    setParticipants((prev) => [...prev, { name: "", email: "", type: "Personal" }]);

  const updateParticipant = (idx, field, value) =>
    setParticipants((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const removeParticipantRow = (idx) =>
    setParticipants((prev) => prev.filter((_, i) => i !== idx));

  // --- Abrir modal CREAR ---
  const openCreateGroup = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormGroup({ name: "", description: "", currency: "COP", isFavorite: false });
    setParticipants([{ name: "", email: "", type: "Personal" }]);
    setShowCreateModal(true);
  };

  // --- Abrir modal EDITAR ---
  const openEditGroup = (group) => {
    setIsEditMode(true);
    setEditingId(group._id);
    setFormGroup({
      name: group.name || "",
      description: group.description || "",
      currency: group.currency || "COP",
      isFavorite: !!group.isFavorite,
    });
    setNewMembersInput(""); // limpiar correos nuevos al entrar a Editar
    setShowCreateModal(true);
  };

  // --- Crear o Editar (submit) ---
  const handleSubmitGroup = async () => {
    const name = (formGroup.name || "").trim();
    if (!name) return;

    // EDITAR
    if (isEditMode && editingId) {
      try {
        const freshToken = localStorage.getItem("token") || "";
        const res = await fetch(`/api/groups/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
            "x-auth-token": freshToken,
          },
          body: JSON.stringify({
            name,
            description: (formGroup.description || "").trim(),
            currency: formGroup.currency,
            isFavorite: !!formGroup.isFavorite,
          }),
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", {
            replace: true,
            state: { from: "/client-dashboard/groups" },
          });
          return;
        }

        const data = await res.json();
        if (res.ok && data?.group) {
          // El endpoint de update devuelve el grupo populado para members
          const updatedGroup = normalizeGroupDetail(data.group);
          setGroups((prev) =>
            prev.map((g) => (g._id === updatedGroup._id ? normalizeGroupList(updatedGroup) : g))
          );

          // 🔹 Agregar nuevos miembros por email si corresponde
          if (newMembersParsed.length > 0) {
            const addToken = localStorage.getItem("token") || "";
            const addRes = await fetch(`/api/groups/${editingId}/add-members-by-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${addToken}`,
                "x-auth-token": addToken,
              },
              body: JSON.stringify({ emails: newMembersParsed }),
            });

            if (addRes.status === 401) {
              localStorage.removeItem("token");
              navigate("/login", {
                replace: true,
                state: { from: "/client-dashboard/groups" },
              });
              return;
            }

            const addData = await addRes.json();
            if (addRes.ok && addData?.group) {
              const withNewMembers = normalizeGroupDetail(addData.group);
              setGroups((prev) =>
                prev.map((g) =>
                  g._id === withNewMembers._id ? normalizeGroupList(withNewMembers) : g
                )
              );
              if (addData.added?.length > 0) {
                alert("✅ Miembro agregado exitosamente");
              } else if (addData.alreadyMembers?.length > 0) {
                alert("ℹ️ Ya era miembro del grupo");
              } else if (addData.notFound?.length > 0) {
                alert("⚠️ No se encontraron los correos ingresados");
              }
            } else if (!addRes.ok) {
              alert(addData?.msg || "No se pudieron agregar los nuevos miembros");
            }
          }

          // limpiar y cerrar
          setNewMembersInput("");
          setShowCreateModal(false);
          setIsEditMode(false);
          setEditingId(null);
        } else {
          alert(data?.msg || "No se pudo editar el grupo");
        }
      } catch (err) {
        console.error("Error editando grupo:", err);
        alert("Error de red");
      }
      return;
    }

    // CREAR
    const inviteEmails = Array.from(
      new Set(
        participants
          .map((p) => (p.email || "").trim().toLowerCase())
          .filter((e) => emailRe.test(e))
      )
    );

    try {
      const freshToken = localStorage.getItem("token") || "";
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
          "x-auth-token": freshToken,
        },
        body: JSON.stringify({
          name,
          description: (formGroup.description || "").trim(),
          currency: formGroup.currency || "COP",
          isFavorite: !!formGroup.isFavorite,
          inviteEmails,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          replace: true,
          state: { from: "/client-dashboard/groups" },
        });
        return;
      }

      const data = await res.json();
      if (res.ok && data?.group) {
        // El create devuelve el grupo populado para members
        const newGroup = normalizeGroupDetail(data.group);
        // En la lista guardamos forma "list": ids string
        setGroups((prev) => [normalizeGroupList(newGroup), ...prev]);
        setShowCreateModal(false);
        setIsEditMode(false);
        setEditingId(null);
        setFormGroup({ name: "", description: "", currency: "COP", isFavorite: false });
        setParticipants([{ name: "", email: "", type: "Personal" }]);
      } else {
        alert(data?.msg || "No se pudo crear el grupo");
      }
    } catch (err) {
      console.error("Error creando grupo:", err);
      alert("Error de red");
    }
  };

  // --- Eliminar miembro (opcional) ---
  const handleRemoveMember = async (groupId, memberId) => {
    if (!window.confirm(lang === "en" ? "Remove this member from the group?" : "¿Eliminar a este miembro del grupo?")) return;
    try {
      const freshToken = localStorage.getItem("token") || "";
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${freshToken}`, "x-auth-token": freshToken },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          replace: true,
          state: { from: "/client-dashboard/groups" },
        });
        return;
      }

      const data = await res.json();
      if (res.ok && data?.group) {
        const updatedGroup = normalizeGroupDetail(data.group);
        // Actualiza en lista con forma "list"
        const updatedForList = normalizeGroupList(updatedGroup);
        setGroups((prev) => prev.map((g) => (g._id === updatedForList._id ? updatedForList : g)));
        if (membersGroup?._id === updatedGroup._id) setMembersGroup(updatedGroup);
      } else {
        alert(data?.msg || (lang === "en" ? "Could not remove the member" : "No se pudo eliminar al miembro"));
      }
    } catch (err) {
      console.error("Error eliminando miembro:", err);
      alert(lang === "en" ? "Network error" : "Error de red");
    }
  };

  // --- Eliminar grupo ---
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm(lang === "en" ? "Delete this group?" : "¿Eliminar este grupo?")) return;
    try {
      const freshToken = localStorage.getItem("token") || "";
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${freshToken}`, "x-auth-token": freshToken },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          replace: true,
          state: { from: "/client-dashboard/groups" },
        });
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g._id !== groupId));
      } else {
        alert(data?.msg || (lang === "en" ? "Could not delete" : "No se pudo eliminar"));
      }
    } catch (err) {
      console.error("Error eliminando grupo:", err);
      alert(lang === "en" ? "Network error" : "Error de red");
    }
  };

  // --- Ver miembros (detalle) ---
  const openViewMembers = async (group) => {
    try {
      const freshToken = localStorage.getItem("token") || "";
      const res = await fetch(`/api/groups/${group._id}`, {
        headers: { Authorization: `Bearer ${freshToken}`, "x-auth-token": freshToken },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          replace: true,
          state: { from: "/client-dashboard/groups" },
        });
        return;
      }

      const data = await res.json();
      const filled = res.ok ? normalizeGroupDetail(data) : group;
      setMembersGroup(filled);
      setMembersOpen(true);
    } catch {
      setMembersGroup(group);
      setMembersOpen(true);
    }
  };

  // --- Invitar por correos (modal independiente opcional) ---
  const openAddMembers = (group) => {
    setInviteForGroup(group);
    setInviteOpen(true);
    setEmailsInput("");
    setAddResult(null);
  };

  const handleAddByEmails = async () => {
    if (emailsParsed.length === 0) return;
    try {
      const freshToken = localStorage.getItem("token") || "";
      const res = await fetch(`/api/groups/${inviteForGroup._id}/add-members-by-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
          "x-auth-token": freshToken,
        },
        body: JSON.stringify({ emails: emailsParsed }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          replace: true,
          state: { from: "/client-dashboard/groups" },
        });
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setAddResult({
          added: data.added || [],
          already: data.alreadyMembers || [],
          notFound: data.notFound || [],
        });
        if (data?.group?._id) {
          const updatedGroup = normalizeGroupDetail(data.group);
          const updatedForList = normalizeGroupList(updatedGroup);
          setGroups((prev) => prev.map((g) => (g._id === updatedForList._id ? updatedForList : g)));
        }
      } else {
        alert(data?.msg || (lang === "en" ? "Could not add" : "No se pudo agregar"));
      }
    } catch (err) {
      console.error("Error agregando por email:", err);
      alert(lang === "en" ? "Network error" : "Error de red");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 drop-shadow">
          {lang === "en" ? "My Groups" : "Mis Grupos"}
        </h2>
        <button
          onClick={openCreateGroup}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
        >
          <FaPlus /> {lang === "en" ? "Create Group" : "Crear Grupo"}
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={lang === "en" ? "Search your groups..." : "Buscar entre tus grupos..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Lista */}
      {filteredGroups.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group._id}
              group={group}
              onDelete={handleDeleteGroup}
              onEdit={openEditGroup}
              onOpen={(g) =>
                navigate(`/client-dashboard/groups/${g._id}`, {
                  state: { from: "/client-dashboard/groups" },
                })
              }
              onViewMembers={openViewMembers}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center mt-16">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
            alt="No groups"
            className="w-32 mx-auto mb-4 opacity-70"
          />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {lang === "en"
              ? "You have no groups yet. Create one to start sharing expenses!"
              : "Aún no tienes grupos. ¡Crea uno para empezar a compartir gastos!"}
          </p>
          <button
            onClick={openCreateGroup}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow"
          >
            {lang === "en" ? "Create my first group" : "Crear mi primer grupo"}
          </button>
        </div>
      )}

      {/* MODAL UNIFICADO: Crear/Editar grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl shadow-xl p-6 w-full max-w-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {isEditMode
                  ? (lang === "en" ? "Edit Group" : "Editar Grupo")
                  : (lang === "en" ? "Create New Group" : "Crear Nuevo Grupo")}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditMode(false);
                  setEditingId(null);
                  setNewMembersInput("");
                }}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
            </div>

            {/* Sección 1: Título */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === "en" ? "Title" : "Título"}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formGroup.isFavorite}
                    onChange={(e) =>
                      setFormGroup({ ...formGroup, isFavorite: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  {lang === "en" ? "Favorite" : "Favorito"}
                </label>
              </div>
              <input
                type="text"
                placeholder={lang === "en" ? "e.g., Trip to the City" : "Por ejemplo, Viaje a la Ciudad"}
                value={formGroup.name}
                onChange={(e) => setFormGroup({ ...formGroup, name: e.target.value })}
                className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-100"
              />
              <textarea
                placeholder={lang === "en" ? "Description (optional)" : "Descripción (opcional)"}
                value={formGroup.description}
                onChange={(e) => setFormGroup({ ...formGroup, description: e.target.value })}
                className="mt-3 w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Sección 2: Divisa */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === "en" ? "Options" : "Opciones"}
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-300">{lang === "en" ? "Currency:" : "Divisa:"}</span>
                <select
                  value={formGroup.currency}
                  onChange={(e) => setFormGroup({ ...formGroup, currency: e.target.value })}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 dark:bg-gray-900 dark:text-gray-100"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span title={lang === "en" ? "Selected" : "Seleccionada"}>✅</span>
              </div>
            </div>

            {/* Sección 3: Participantes (solo crear) */}
            {!isEditMode && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "en" ? "Members" : "Miembros"}
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {participants.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {lang === "en" ? "Participant name" : "Nombre del participante"}
                        </label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => updateParticipant(idx, "name", e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                          placeholder={lang === "en" ? "e.g., Alex" : "Ej: Alex"}
                        />
                      </div>
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {lang === "en" ? "Email" : "Correo"}
                        </label>
                        <input
                          type="email"
                          value={p.email}
                          onChange={(e) => updateParticipant(idx, "email", e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                          placeholder={lang === "en" ? "alex@mail.com" : "alex@correo.com"}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {lang === "en" ? "Tag" : "Etiqueta"}
                        </label>
                        <input
                          type="text"
                          value={p.type}
                          onChange={(e) => updateParticipant(idx, "type", e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                          placeholder={lang === "en" ? "Personal" : "Personal"}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {participants.length > 1 && (
                          <button
                            onClick={() => removeParticipantRow(idx)}
                            className="text-rose-600 text-sm hover:underline"
                            title={lang === "en" ? "Remove" : "Quitar"}
                          >
                            {lang === "en" ? "Remove" : "Quitar"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <button
                    onClick={addParticipantRow}
                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    {lang === "en" ? "Add another participant" : "Añadir Otro Participante"}
                  </button>
                </div>
              </div>
            )}

            {/* 🔹 NUEVO — Sección 3-b: Agregar nuevos miembros (solo en Editar) */}
            {isEditMode && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "en" ? "Add new members (optional)" : "Agregar nuevos miembros (opcional)"}
                </h4>

                <textarea
                  rows={3}
                  placeholder={
                    lang === "en"
                      ? "Type emails separated by comma, space or newline"
                      : "Escribe correos separados por coma, espacio o salto de línea"
                  }
                  value={newMembersInput}
                  onChange={(e) => setNewMembersInput(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                />

                {/* Vista previa */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {newMembersParsed.map((em) => (
                    <span
                      key={em}
                      className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-xs"
                    >
                      {em}
                    </span>
                  ))}
                  {newMembersParsed.length === 0 && (
                    <span className="text-xs text-gray-400">
                      {lang === "en" ? "No valid emails yet…" : "No hay correos válidos aún…"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Acciones modal */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditMode(false);
                  setEditingId(null);
                  setNewMembersInput("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                onClick={handleSubmitGroup}
                disabled={!formGroup.name.trim()}
                className={`px-4 py-2 rounded-lg text-white shadow ${
                  formGroup.name.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {isEditMode
                  ? (lang === "en" ? "Save changes" : "Guardar Cambios")
                  : (lang === "en" ? "Create group" : "Crear grupo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (Opcional) MODAL: Ver miembros */}
      {membersOpen && membersGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {lang === "en" ? "Members of" : "Miembros de"} {membersGroup.name}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-200 max-h-64 overflow-y-auto">
              {membersGroup.members?.length > 0 ? (
                membersGroup.members.map((m) => {
                  const mId = m._id || toId(m);
                  const isOwner = toId(membersGroup.owner) === toId(mId);
                  const canRemove = !!membersGroup.isAdmin && !isOwner;

                  return (
                    <li
                      key={m._id || m.email || toId(m)}
                      className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700"
                    >
                      <div>
                        <span className="font-medium">{m.name || "(sin nombre)"} </span>
                        <span className="text-gray-500 ml-2">{m.email || toId(m)}</span>
                        {isOwner && (
                          <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            OWNER
                          </span>
                        )}
                      </div>

                      {canRemove ? (
                        <button
                          onClick={() => handleRemoveMember(membersGroup._id, mId)}
                          className="text-rose-600 text-sm hover:underline"
                          title={lang === "en" ? "Remove from group" : "Eliminar del grupo"}
                        >
                          {lang === "en" ? "Remove" : "Eliminar"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {isOwner ? (lang === "en" ? "Owner" : "Propietario") : ""}
                        </span>
                      )}
                    </li>
                  );
                })
              ) : (
                <li className="text-gray-400">
                  {lang === "en" ? "No members yet" : "No hay miembros aún"}
                </li>
              )}
            </ul>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setMembersOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (Opcional) MODAL: Agregar miembros por correo */}
      {inviteOpen && inviteForGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl shadow-xl p-6 w-full max-w-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {(lang === "en" ? "Add members — " : "Agregar miembros — ") + inviteForGroup.name}
              </h3>
              <button
                onClick={() => setInviteOpen(false)}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>

            <div>
              <h4 className="font-medium mb-2">{lang === "en" ? "Add by email" : "Añadir por correo"}</h4>
              <textarea
                rows={3}
                placeholder={
                  lang === "en"
                    ? "Type emails separated by comma, space or newline"
                    : "Escribe correos separados por coma, espacio o salto de línea"
                }
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
              />
              {/* Vista previa */}
              <div className="mt-2 flex flex-wrap gap-2">
                {emailsParsed.map((em) => (
                  <span
                    key={em}
                    className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-xs"
                  >
                    {em}
                  </span>
                ))}
                {emailsParsed.length === 0 && (
                  <span className="text-xs text-gray-400">
                    {lang === "en" ? "No valid emails yet…" : "No hay correos válidos aún…"}
                  </span>
                )}
              </div>

              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddByEmails}
                  disabled={emailsParsed.length === 0}
                  className={`px-4 py-2 rounded-lg text-white shadow ${
                    emailsParsed.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {lang === "en" ? "Add" : "Agregar"}
                </button>
              </div>

              {addResult && (
                <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-emerald-700">{lang === "en" ? "Added" : "Agregados"}</p>
                    <ul className="list-disc list-inside text-emerald-700">
                      {addResult.added.length ? addResult.added.map((e) => <li key={e}>{e}</li>) : <li>—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-700">
                      {lang === "en" ? "Already members" : "Ya eran miembros"}
                    </p>
                    <ul className="list-disc list-inside text-amber-700">
                      {addResult.already.length ? addResult.already.map((e) => <li key={e}>{e}</li>) : <li>—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-700">
                      {lang === "en" ? "Not found" : "No encontrados"}
                    </p>
                    <ul className="list-disc list-inside text-rose-700">
                      {addResult.notFound.length ? addResult.notFound.map((e) => <li key={e}>{e}</li>) : <li>—</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setInviteOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsManager;
