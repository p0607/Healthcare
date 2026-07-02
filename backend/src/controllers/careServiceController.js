const prisma = require('../lib/prisma');
const { isCaregiverCategory } = require('../lib/caregiverCategories');
const { audit } = require('../lib/auditLog');

const REGISTER_TYPE_LABELS = {
  nurse_visit: 'Nurse',
  doctor_consult: 'Doctor',
  physiotherapy: 'Physio',
  emergency: 'Ambulance',
};

const SERVICE_TYPES = new Set([
  'nurse_visit',
  'doctor_consult',
  'physiotherapy',
  'iv_drip',
  'wound_care',
  'elderly_care',
  'emergency',
]);

/** Service types that have at least one active sub-service (for registration & booking). */
exports.listAvailableTypes = async (req, res) => {
  try {
    const grouped = await prisma.careServiceOption.groupBy({
      by: ['serviceType'],
      where: { active: true },
      _count: { id: true },
    });

    const typeOrder = ['nurse_visit', 'doctor_consult', 'physiotherapy', 'emergency'];
    const types = grouped
      .filter((row) => row._count.id > 0 && SERVICE_TYPES.has(row.serviceType))
      .map((row) => ({
        serviceType: row.serviceType,
        label:
          REGISTER_TYPE_LABELS[row.serviceType] ||
          String(row.serviceType).replace(/_/g, ' '),
        optionCount: row._count.id,
        registerable: isCaregiverCategory(row.serviceType),
      }))
      .sort((a, b) => {
        const ai = typeOrder.indexOf(a.serviceType);
        const bi = typeOrder.indexOf(b.serviceType);
        if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

    res.json({ types });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load service types' });
  }
};

exports.listPublic = async (req, res) => {
  const st = req.query.serviceType;
  const where = { active: true };
  if (st && SERVICE_TYPES.has(String(st))) {
    where.serviceType = String(st);
  }
  const options = await prisma.careServiceOption.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, label: true, description: true, imageUrl: true, rate: true, serviceType: true },
  });
  res.json({ options });
};

exports.listAdmin = async (req, res) => {
  try {
    const st = req.query.serviceType;
    const where = {};
    if (st && SERVICE_TYPES.has(String(st))) where.serviceType = String(st);
    const options = await prisma.careServiceOption.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ options });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load visit options' });
  }
};

exports.create = async (req, res) => {
  try {
    const { label, description, imageUrl, sortOrder, serviceType, rate } = req.body;
    const trimmed = (label || '').trim();
    if (!trimmed) return res.status(400).json({ message: 'Label is required' });

    const st = serviceType != null && SERVICE_TYPES.has(String(serviceType)) ? String(serviceType) : 'nurse_visit';
    const r = Math.max(0, Math.round(Number(rate)) || 0);

    const option = await prisma.careServiceOption.create({
      data: {
        label: trimmed,
        description: description?.trim() || null,
        imageUrl: imageUrl === null || imageUrl === '' ? null : String(imageUrl).trim(),
        serviceType: st,
        rate: r,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      },
    });
    audit(req, {
      action: 'catalog.care_service.created',
      entityType: 'CareServiceOption',
      entityId: option.id,
      metadata: { label: trimmed, serviceType: st, rate: r },
    });
    res.status(201).json({ option });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not create visit option' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { label, description, imageUrl, active, sortOrder, serviceType, rate } = req.body;

  const data = {};
  if (label !== undefined) {
    const t = String(label).trim();
    if (!t) return res.status(400).json({ message: 'Label cannot be empty' });
    data.label = t;
  }
  if (description !== undefined) data.description = description === null || description === '' ? null : String(description).trim();
  if (imageUrl !== undefined) data.imageUrl = imageUrl === null || imageUrl === '' ? null : String(imageUrl).trim();
  if (active !== undefined) data.active = Boolean(active);
  if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) data.sortOrder = Number(sortOrder);
  if (rate !== undefined) data.rate = Math.max(0, Math.round(Number(rate)) || 0);
  if (serviceType !== undefined) {
    const st = String(serviceType);
    if (!SERVICE_TYPES.has(st)) return res.status(400).json({ message: 'Invalid service type' });
    data.serviceType = st;
  }

  try {
    const option = await prisma.careServiceOption.update({
      where: { id },
      data,
    });
    audit(req, {
      action: 'catalog.care_service.updated',
      entityType: 'CareServiceOption',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    res.json({ option });
  } catch {
    res.status(404).json({ message: 'Option not found' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.careServiceOption.delete({ where: { id } });
    audit(req, {
      action: 'catalog.care_service.deleted',
      entityType: 'CareServiceOption',
      entityId: id,
    });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Option not found' });
  }
};
