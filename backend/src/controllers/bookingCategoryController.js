const fs = require('fs/promises');
const path = require('path');
const { audit } = require('../lib/auditLog');

const DATA_FILE = path.join(__dirname, '../../data/bookingCategories.json');
const MAX_IMAGE_CHARS = 600_000;

const BOOKING_SERVICE_TYPES = ['nurse_visit', 'doctor_consult', 'physiotherapy', 'emergency'];

const DEFAULT_META = {
  nurse_visit: { label: 'Nurse visit', subtitle: 'Nursing at home' },
  doctor_consult: { label: 'Doctor', subtitle: 'Doctor consultation' },
  physiotherapy: { label: 'Physio', subtitle: 'Physiotherapy' },
  emergency: { label: 'Emergency', subtitle: 'Urgent response' },
};

function normalizeImageUrl(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const url = String(value).trim();
  if (!url) return null;
  if (url.length > MAX_IMAGE_CHARS) {
    const err = new Error('Image is too large. Use a smaller file (under ~450 KB).');
    err.status = 400;
    throw err;
  }
  return url;
}

async function readStored() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.categories && typeof parsed.categories === 'object' ? parsed.categories : {};
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeStored(categories) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ categories }, null, 2));
}

function buildCategoryList(stored) {
  return BOOKING_SERVICE_TYPES.map((serviceType) => {
    const meta = DEFAULT_META[serviceType] || {
      label: serviceType.replace(/_/g, ' '),
      subtitle: '',
    };
    const row = stored[serviceType] || {};
    return {
      serviceType,
      label: meta.label,
      subtitle: row.subtitle?.trim() || meta.subtitle,
      imageUrl: row.imageUrl || null,
    };
  });
}

exports.listPublic = async (req, res) => {
  try {
    const stored = await readStored();
    res.json({ categories: buildCategoryList(stored) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load care types' });
  }
};

exports.listAdmin = async (req, res) => {
  try {
    const stored = await readStored();
    res.json({ categories: buildCategoryList(stored) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load care types' });
  }
};

exports.update = async (req, res) => {
  try {
    const serviceType = String(req.params.serviceType || '');
    if (!BOOKING_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ message: 'Invalid care type' });
    }

    const stored = await readStored();
    const prev = stored[serviceType] || {};
    const next = { ...prev };

    if (req.body.imageUrl !== undefined) {
      next.imageUrl = normalizeImageUrl(req.body.imageUrl);
    }
    if (req.body.subtitle !== undefined) {
      next.subtitle = String(req.body.subtitle || '').trim();
    }

    stored[serviceType] = next;
    await writeStored(stored);

    audit(req, {
      action: 'catalog.booking_category.updated',
      entityType: 'file:bookingCategories',
      entityId: serviceType,
      metadata: {
        fields: [
          ...(req.body.imageUrl !== undefined ? ['imageUrl'] : []),
          ...(req.body.subtitle !== undefined ? ['subtitle'] : []),
        ],
      },
    });

    const [category] = buildCategoryList(stored).filter((c) => c.serviceType === serviceType);
    res.json({ category });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Could not save care type' });
  }
};
