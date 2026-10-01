import React, { useState } from "react";
import { FiMoreVertical, FiEdit2, FiTrash2, FiUsers } from "react-icons/fi";
import { isOwner, toId } from "../utils/ids";

/** Owner o Admin pueden gestionar miembros */
const isAdminLike = (group, currentUserId) => {
  const me = toId(currentUserId);
  const owner = toId(group?.owner);
  const admins = Array.isArray(group?.admins) ? group.admins.map(toId) : [];
  return !!me && (me === owner || admins.includes(me));
};

export default function GroupCard({
  group,
  onOpen,
  onEdit,
  onDelete,
  onViewMembers,        // 👈 pásalo desde GroupsManager
  currentUserId
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // SOLO el dueño ve el menú de editar/eliminar grupo
  const canManage = isOwner(group, currentUserId);
  // Owner o Admin pueden abrir "Miembros"
  const canViewMembers = isAdminLike(group, currentUserId);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm relative">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
          {canManage && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              OWNER
            </span>
          )}
        </div>

        {canManage && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded hover:bg-gray-100"
            aria-label="Más acciones"
          >
            <FiMoreVertical />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-1">
        {group.description || "Sin descripción"}
      </p>

      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <div>
          Creado: {new Date(group.createdAt || Date.now()).toLocaleString("es-ES")}
        </div>
        <div>
          Última actividad:{" "}
          {new Date(
            group.updatedAt || group.lastActivity || group.createdAt || Date.now()
          ).toLocaleString("es-ES")}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <FiUsers /> {group.members?.length || 0} miembros
      </div>

      {/* Acciones */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onOpen(group)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Abrir
        </button>

        {/* 👇 Botón Miembros para owner o admin (abre modal en GroupsManager) */}
        {canViewMembers && typeof onViewMembers === "function" && (
          <button
            onClick={() => onViewMembers(group)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
            title="Gestionar miembros"
          >
            Miembros
          </button>
        )}
      </div>

      {menuOpen && canManage && (
        <div className="absolute right-3 top-10 w-44 bg-white border rounded-xl shadow-lg z-10">
          <button
            onClick={() => { setMenuOpen(false); onEdit(group); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
          >
            <FiEdit2 /> Editar
          </button>
          <button
            onClick={() => { setMenuOpen(false); onDelete(group._id); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-rose-600 flex items-center gap-2"
          >
            <FiTrash2 /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
