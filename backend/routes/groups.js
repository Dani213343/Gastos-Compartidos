// backend/routes/groups.js
const express = require('express');
const router = express.Router();
const { Types } = require('mongoose');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createGroupSchema, updateGroupSchema } = require('../middleware/validators');

const Group = require('../models/Group');
const User = require('../models/User');
const GroupRole = require('../models/GroupRole'); // 👈 NUEVO

// 👇👇👇 IMPORTA EL BUS (microkernel parcial: eventos para plugins)
const bus = require('../kernel/bus');

// helpers
const isValidId = (id) => Types.ObjectId.isValid(id);
const onlyUniqueIds = (arr) =>
  Array.from(new Set((arr || []).filter(Boolean).map((x) => x.toString())));
const getReqUserId = (req) =>
  String(req.user?.id || req.user?.sub || req.user?._id || '');

const isAdmin = (group, userId) => {
  const uid = String(userId);
  return (
    (group.owner && String(group.owner) === uid) ||
    (Array.isArray(group.admins) && group.admins.map(String).includes(uid))
  );
};

// ================== CREAR ==================
router.post('/', auth, validate.body(createGroupSchema), async (req, res, next) => {
  try {
    const creatorIdStr = getReqUserId(req);
    if (!creatorIdStr) return res.status(401).json({ msg: 'No autenticado' });
    const creatorId = new Types.ObjectId(creatorIdStr); // 👈 asegura ObjectId

    let {
      name,
      description = '',
      currency = 'COP',
      isFavorite = false,
      inviteEmails,
    } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(422).json({ msg: 'Nombre inválido' });
    }

    inviteEmails = Array.isArray(inviteEmails)
      ? inviteEmails.filter(Boolean).map((e) => String(e).toLowerCase().trim())
      : [];

    const users = inviteEmails.length
      ? await User.find({ email: { $in: inviteEmails } }).select('_id email')
      : [];

    const memberIds = onlyUniqueIds([creatorIdStr, ...users.map((u) => u._id)]);
    const foundEmails = new Set(users.map((u) => u.email));
    const notFound = inviteEmails.filter((e) => !foundEmails.has(e));

    const group = await Group.create({
      name: name.trim(),
      description,
      currency,
      isFavorite: !!isFavorite,
      members: memberIds, // Mongoose castea a ObjectId
      owner: creatorId,   // 👈 marca dueño
      admins: [creatorId],
      lastActivity: Date.now(),
    });

    // 👇 Registrar/asegurar rol del creador (owner) en grouproles
    try {
      await GroupRole.updateOne(
        { group: group._id, user: creatorId },
        { $setOnInsert: { role: 'owner' } },
        { upsert: true }
      );
    } catch (e) {
      // Si hubo reintento y existe, ignora 11000
      if (!(e && e.code === 11000)) throw e;
    }

    const populated = await Group.findById(group._id).populate(
      'members',
      'name email'
    );

    // 🔔 Evento para plugins (audit, webhooks, etc.)
    bus.emit('group.created', {
      groupId: group._id.toString(),
      ownerId: creatorIdStr,
      invited: inviteEmails,
      notFound
    });

    return res.status(201).json({
      msg: 'Grupo creado',
      group: populated,
      added: users.map((u) => u.email),
      notFound,
      isAdmin: true,
    });
  } catch (err) {
    return next(err);
  }
});

// ================== DETALLE ==================
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ msg: 'ID inválido' });

    const group = await Group.findById(id).populate('members', 'name email');
    if (!group) return res.status(404).json({ msg: 'Grupo no encontrado' });

    const myId = getReqUserId(req);
    const memberIds = (group.members || [])
      .map((m) => m?._id?.toString())
      .filter(Boolean);
    if (!memberIds.includes(myId)) {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    // Normaliza posibles duplicados
    const unique = onlyUniqueIds(memberIds);
    if (unique.length !== memberIds.length) {
      group.members = unique;
      await group.save();
      await group.populate('members', 'name email');
    }

    res.json({ ...group.toObject(), isAdmin: isAdmin(group, myId) });
  } catch (err) {
    return next(err);
  }
});

// ================== ACTUALIZAR (admin) ==================
const updateHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ msg: 'ID inválido' });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ msg: 'Grupo no encontrado' });

    if (!isAdmin(group, getReqUserId(req))) {
      return res.status(403).json({ msg: 'Solo el administrador puede editar' });
    }

    const { name, description, currency, isFavorite } = req.body;
    const before = {
      name: group.name,
      description: group.description,
      currency: group.currency,
      isFavorite: group.isFavorite
    };

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (currency !== undefined) group.currency = currency;
    if (isFavorite !== undefined) group.isFavorite = !!isFavorite;

    group.lastActivity = Date.now();
    await group.save();

    const updated = await Group.findById(group._id).populate(
      'members',
      'name email'
    );

    // 🔔 Evento de actualización
    bus.emit('group.updated', {
      groupId: group._id.toString(),
      before,
      after: {
        name: updated.name,
        description: updated.description,
        currency: updated.currency,
        isFavorite: updated.isFavorite
      }
    });

    res.json({ msg: 'Grupo actualizado', group: updated, isAdmin: true });
  } catch (err) {
    return next(err);
  }
};

router.put('/:id', auth, validate.body(updateGroupSchema), updateHandler);
router.patch('/:id', auth, validate.body(updateGroupSchema), updateHandler);

// ================== AGREGAR MIEMBROS (admin) ==================
router.post('/:id/add-members-by-email', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ msg: 'ID inválido' });

    const { emails } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ msg: 'Debe enviar un arreglo de emails' });
    }

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ msg: 'Grupo no encontrado' });

    if (!isAdmin(group, getReqUserId(req))) {
      return res
        .status(403)
        .json({ msg: 'Solo el administrador puede agregar' });
    }

    const normalized = emails
      .filter(Boolean)
      .map((e) => String(e).toLowerCase());
    const users = await User.find({ email: { $in: normalized } }).select(
      '_id email'
    );

    const existing = new Set((group.members || []).map((x) => String(x)));
    const foundSet = new Set(users.map((u) => u.email));
    const added = [];
    const alreadyMembers = [];

    for (const u of users) {
      const sid = String(u._id);
      if (!existing.has(sid)) {
        existing.add(sid);
        added.push(u.email);
      } else {
        alreadyMembers.push(u.email);
      }
    }

    const notFound = normalized.filter((e) => !foundSet.has(e));

    if (added.length > 0) {
      group.members = Array.from(existing);
      group.lastActivity = Date.now();
      await group.save();
    }

    const populated = await Group.findById(group._id).populate(
      'members',
      'name email'
    );

    // 🔔 Evento de miembros agregados (si hubo nuevos)
    if (added.length > 0 || notFound.length > 0) {
      bus.emit('group.members.added', {
        groupId: group._id.toString(),
        addedEmails: added,
        notFoundEmails: notFound
      });
      // También puedes emitir un genérico de actualización
      bus.emit('group.updated', { groupId: group._id.toString() });
    }

    res.json({
      msg: 'Miembros procesados',
      added,
      alreadyMembers,
      notFound,
      group: populated,
      isAdmin: true,
    });
  } catch (err) {
    return next(err);
  }
});

// ================== ELIMINAR MIEMBRO (admin) ==================
router.delete('/:id/members/:memberId', auth, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    if (!isValidId(id) || !isValidId(memberId))
      return res.status(400).json({ msg: 'ID inválido' });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ msg: 'Grupo no encontrado' });

    if (!isAdmin(group, getReqUserId(req))) {
      return res
        .status(403)
        .json({ msg: 'Solo el administrador puede eliminar' });
    }
    if (String(group.owner) === String(memberId)) {
      return res.status(400).json({
        msg: 'No puedes eliminar al dueño. Transfiere la administración primero.',
      });
    }

    const current = onlyUniqueIds(group.members);
    if (current.length <= 1 && current[0] === memberId) {
      return res
        .status(400)
        .json({ msg: 'No puedes dejar el grupo sin miembros' });
    }

    const nextMembers = current.filter((mId) => mId !== memberId);
    if (nextMembers.length === current.length) {
      const populated = await Group.findById(group._id).populate(
        'members',
        'name email'
      );
      return res.json({ msg: 'Nada que eliminar', group: populated, isAdmin: true });
    }

    group.members = nextMembers;
    group.lastActivity = Date.now();
    await group.save();

    const populated = await Group.findById(group._id).populate(
      'members',
      'name email'
    );

    // 🔔 Evento de miembro eliminado
    bus.emit('group.members.removed', {
      groupId: group._id.toString(),
      memberId: String(memberId)
    });
    bus.emit('group.updated', { groupId: group._id.toString() });

    res.json({ msg: 'Miembro eliminado', group: populated, isAdmin: true });
  } catch (err) {
    return next(err);
  }
});

// ================== ELIMINAR GRUPO (admin) ==================
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ msg: 'ID inválido' });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ msg: 'Grupo no encontrado' });

    if (!isAdmin(group, getReqUserId(req))) {
      return res
        .status(403)
        .json({ msg: 'Solo el administrador puede eliminar el grupo' });
    }

    await Group.deleteOne({ _id: id });

    // 🔔 Evento de eliminado
    bus.emit('group.deleted', { groupId: String(id) });

    res.json({ msg: 'Grupo eliminado' });
  } catch (err) {
    return next(err);
  }
});

// ================== LISTAR MIS GRUPOS ==================
router.get('/', auth, async (req, res, next) => {
  try {
    const myIdStr = getReqUserId(req);
    if (!isValidId(myIdStr)) return res.json([]); // token extraño

    const myId = new Types.ObjectId(myIdStr); // 👈 fuerza ObjectId
    const groups = await Group.find({ members: myId })
      .select(
        'name description currency isFavorite members owner admins createdAt updatedAt lastActivity'
      )
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
