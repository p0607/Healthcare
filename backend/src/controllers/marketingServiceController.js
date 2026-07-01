const fs = require('fs/promises');
const path = require('path');
const prisma = require('../lib/prisma');
const { audit } = require('../lib/auditLog');

const DATA_FILE = path.join(__dirname, '../../data/marketingServices.json');

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const MAX_IMAGE_CHARS = 600_000;

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

function emptyCatalogExtras() {
  return { hiddenDefaultSections: [], hiddenDefaultServices: {}, defaultSectionImages: {}, defaultServiceImages: {} };
}

const inferServiceType = (...parts) => {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  if (/emergency|ambulance|rapid|er\b|paramedic/.test(text)) return 'emergency';
  if (/doctor|physician|consult|clinic|medical/.test(text)) return 'doctor_consult';
  if (/physio|therapy|rehab|mobility|pain|knee|orthopedic/.test(text)) return 'physiotherapy';
  return 'nurse_visit';
};

async function readCatalogData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const extras = emptyCatalogExtras();
    return {
      sections: Array.isArray(parsed?.sections) ? parsed.sections : [],
      hiddenDefaultSections: Array.isArray(parsed?.hiddenDefaultSections)
        ? parsed.hiddenDefaultSections
        : extras.hiddenDefaultSections,
      hiddenDefaultServices:
        parsed?.hiddenDefaultServices && typeof parsed.hiddenDefaultServices === 'object'
          ? parsed.hiddenDefaultServices
          : extras.hiddenDefaultServices,
      defaultSectionImages:
        parsed?.defaultSectionImages && typeof parsed.defaultSectionImages === 'object'
          ? parsed.defaultSectionImages
          : extras.defaultSectionImages,
      defaultServiceImages:
        parsed?.defaultServiceImages && typeof parsed.defaultServiceImages === 'object'
          ? parsed.defaultServiceImages
          : extras.defaultServiceImages,
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { sections: [], ...emptyCatalogExtras() };
    }
    throw err;
  }
}

async function readCatalog() {
  return (await readCatalogData()).sections;
}

async function writeCatalog(sections) {
  const existing = await readCatalogData();
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      {
        ...existing,
        sections,
      },
      null,
      2
    )
  );
}

async function writeCatalogData(data) {
  const extras = emptyCatalogExtras();
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      {
        sections: Array.isArray(data.sections) ? data.sections : [],
        hiddenDefaultSections: Array.isArray(data.hiddenDefaultSections)
          ? data.hiddenDefaultSections
          : extras.hiddenDefaultSections,
        hiddenDefaultServices:
          data.hiddenDefaultServices && typeof data.hiddenDefaultServices === 'object'
            ? data.hiddenDefaultServices
            : extras.hiddenDefaultServices,
        defaultSectionImages:
          data.defaultSectionImages && typeof data.defaultSectionImages === 'object'
            ? data.defaultSectionImages
            : extras.defaultSectionImages,
        defaultServiceImages:
          data.defaultServiceImages && typeof data.defaultServiceImages === 'object'
            ? data.defaultServiceImages
            : extras.defaultServiceImages,
      },
      null,
      2
    )
  );
}

async function syncCareOption(serviceName, service) {
  const serviceType = inferServiceType(serviceName, service.laymanName, service.description);
  const imageUrl =
    service.imageUrl !== undefined ? normalizeImageUrl(service.imageUrl) : undefined;
  const baseData = {
    label: service.laymanName,
    description: service.description || null,
    rate: Math.max(0, Math.round(Number(service.rate)) || 0),
    active: service.active !== false,
    serviceType,
  };
  if (imageUrl !== undefined) baseData.imageUrl = imageUrl;

  if (service.careServiceOptionId) {
    try {
      await prisma.careServiceOption.update({
        where: { id: service.careServiceOptionId },
        data: baseData,
      });
      return service.careServiceOptionId;
    } catch {}
  }

  const existing = await prisma.careServiceOption.findFirst({
    where: { label: service.laymanName, serviceType },
  });
  if (existing) {
    const patch = {
      description: service.description || null,
      rate: Math.max(0, Math.round(Number(service.rate)) || 0),
      active: service.active !== false,
    };
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;
    await prisma.careServiceOption.update({
      where: { id: existing.id },
      data: patch,
    });
    return existing.id;
  }

  const created = await prisma.careServiceOption.create({
    data: {
      label: service.laymanName,
      description: service.description || null,
      rate: Math.max(0, Math.round(Number(service.rate)) || 0),
      serviceType,
      active: service.active !== false,
      imageUrl: imageUrl !== undefined ? imageUrl : null,
    },
  });
  return created.id;
}

async function setCareOptionActive(service, active) {
  if (service?.careServiceOptionId) {
    try {
      await prisma.careServiceOption.update({
        where: { id: service.careServiceOptionId },
        data: { active },
      });
      return;
    } catch {}
  }
  if (service?.laymanName) {
    await prisma.careServiceOption.updateMany({
      where: { label: service.laymanName },
      data: { active },
    });
  }
}

async function removeCareOption(service) {
  if (service?.careServiceOptionId) {
    try {
      await prisma.careServiceOption.delete({ where: { id: service.careServiceOptionId } });
      return;
    } catch {}
  }
  if (service?.laymanName) {
    await prisma.careServiceOption.deleteMany({ where: { label: service.laymanName } });
  }
}

exports.listPublic = async (_req, res) => {
  const data = await readCatalogData();
  res.json({
    hiddenDefaultSections: data.hiddenDefaultSections,
    hiddenDefaultServices: data.hiddenDefaultServices,
    defaultSectionImages: data.defaultSectionImages,
    defaultServiceImages: data.defaultServiceImages,
    sections: data.sections
      .filter((section) => section.active !== false)
      .map((section) => ({
        ...section,
        services: (section.services || []).filter((service) => service.active !== false),
      }))
      .filter((section) => section.services.length > 0),
  });
};

exports.listAdmin = async (_req, res) => {
  const data = await readCatalogData();
  res.json(data);
};

exports.create = async (req, res) => {
  const serviceName = String(req.body.serviceName || '').trim();
  const subServices = Array.isArray(req.body.subServices)
    ? req.body.subServices
    : [
        {
          name: req.body.subServiceName,
          description: req.body.description,
          rate: req.body.rate ?? req.body.costing,
        },
      ];
  const cleanedSubServices = subServices
    .map((row) => ({
      name: String(row.name || row.subServiceName || '').trim(),
      description: String(row.description || '').trim(),
      rate: Math.max(0, Math.round(Number(row.rate ?? row.costing)) || 0),
      imageUrl: row.imageUrl !== undefined ? normalizeImageUrl(row.imageUrl) : null,
    }))
    .filter((row) => row.name);

  if (!serviceName) return res.status(400).json({ message: 'Service name is required' });
  if (cleanedSubServices.length === 0) return res.status(400).json({ message: 'Add at least one sub-service' });

  const now = new Date().toISOString();
  const sections = await readCatalog();
  const serviceId = slugify(serviceName);
  let section = sections.find((row) => row.id === serviceId);

  if (!section) {
    section = {
      id: serviceId,
      title: serviceName,
      tagline: cleanedSubServices[0].description || `${cleanedSubServices[0].name} and related home-care services.`,
      active: true,
      createdAt: now,
      updatedAt: now,
      services: [],
    };
    sections.push(section);
  }

  section.updatedAt = now;
  section.services = section.services || [];

  for (const [index, row] of cleanedSubServices.entries()) {
    const baseId = `${serviceId}-${slugify(row.name) || Date.now()}`;
    const id = section.services.some((service) => service.id === baseId)
      ? `${baseId}-${Date.now()}-${index}`
      : baseId;
    const service = {
      id,
      laymanName: row.name,
      tagline: row.description || `Book ${row.name} at home`,
      description: row.description,
      rate: row.rate,
      imageUrl: row.imageUrl,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    service.careServiceOptionId = await syncCareOption(serviceName, service);
    section.services.push(service);
  }

  await writeCatalog(sections);
  audit(req, {
    action: 'catalog.marketing.created',
    entityType: 'file:marketingServices',
    entityId: section.id,
    metadata: { title: section.title, subServiceCount: cleanedSubServices.length },
  });
  res.status(201).json({ section });
};

exports.updateSection = async (req, res) => {
  const sections = await readCatalog();
  const section = sections.find((row) => row.id === req.params.sectionId);
  if (!section) return res.status(404).json({ message: 'Service not found' });

  if (req.body.active !== undefined) {
    const active = Boolean(req.body.active);
    section.active = active;
    await Promise.all((section.services || []).map((service) => setCareOptionActive(service, active)));
  }
  section.updatedAt = new Date().toISOString();
  await writeCatalog(sections);
  audit(req, {
    action: 'catalog.marketing.section_updated',
    entityType: 'file:marketingServices',
    entityId: section.id,
    metadata: { fields: req.body.active !== undefined ? ['active'] : [] },
  });
  res.json({ section });
};

exports.removeSection = async (req, res) => {
  const sections = await readCatalog();
  const index = sections.findIndex((row) => row.id === req.params.sectionId);
  if (index === -1) return res.status(404).json({ message: 'Service not found' });

  const [section] = sections.splice(index, 1);
  await Promise.all((section.services || []).map(removeCareOption));
  await writeCatalog(sections);
  audit(req, {
    action: 'catalog.marketing.section_deleted',
    entityType: 'file:marketingServices',
    entityId: section.id,
    metadata: { title: section.title },
  });
  res.json({ ok: true });
};

exports.updateSubService = async (req, res) => {
  try {
    const sections = await readCatalog();
    const section = sections.find((row) => row.id === req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Service not found' });
    const service = (section.services || []).find((row) => row.id === req.params.serviceId);
    if (!service) return res.status(404).json({ message: 'Sub-service not found' });

    if (req.body.active !== undefined) {
      service.active = Boolean(req.body.active);
      await setCareOptionActive(service, service.active);
    }
    if (req.body.imageUrl !== undefined) {
      service.imageUrl = normalizeImageUrl(req.body.imageUrl);
      service.careServiceOptionId = await syncCareOption(section.title, service);
    }
    service.updatedAt = new Date().toISOString();
    section.updatedAt = service.updatedAt;
    await writeCatalog(sections);
    res.json({ service });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Update failed' });
  }
};

exports.removeSubService = async (req, res) => {
  const sections = await readCatalog();
  const section = sections.find((row) => row.id === req.params.sectionId);
  if (!section) return res.status(404).json({ message: 'Service not found' });
  const index = (section.services || []).findIndex((row) => row.id === req.params.serviceId);
  if (index === -1) return res.status(404).json({ message: 'Sub-service not found' });

  const [service] = section.services.splice(index, 1);
  await removeCareOption(service);
  section.updatedAt = new Date().toISOString();
  await writeCatalog(sections);
  res.json({ ok: true });
};

exports.updateDefaultSection = async (req, res) => {
  const data = await readCatalogData();
  const sectionId = String(req.params.sectionId || '').trim();
  if (!sectionId) return res.status(400).json({ message: 'Service id is required' });

  const hidden = new Set(data.hiddenDefaultSections);
  if (req.body.active === false) {
    hidden.add(sectionId);
  } else {
    hidden.delete(sectionId);
  }
  data.hiddenDefaultSections = [...hidden];
  await writeCatalogData(data);
  res.json({ hiddenDefaultSections: data.hiddenDefaultSections });
};

exports.removeDefaultSection = async (req, res) => {
  const data = await readCatalogData();
  const sectionId = String(req.params.sectionId || '').trim();
  if (!sectionId) return res.status(400).json({ message: 'Service id is required' });

  data.hiddenDefaultSections = [...new Set([...data.hiddenDefaultSections, sectionId])];
  await writeCatalogData(data);
  res.json({ hiddenDefaultSections: data.hiddenDefaultSections });
};

exports.updateDefaultSubService = async (req, res) => {
  try {
    const data = await readCatalogData();
    const sectionId = String(req.params.sectionId || '').trim();
    const serviceId = String(req.params.serviceId || '').trim();
    if (!sectionId || !serviceId) return res.status(400).json({ message: 'Service ids are required' });

    const hiddenForSection = new Set(data.hiddenDefaultServices[sectionId] || []);
    if (req.body.active === false) {
      hiddenForSection.add(serviceId);
    } else if (req.body.active === true) {
      hiddenForSection.delete(serviceId);
    }
    data.hiddenDefaultServices[sectionId] = [...hiddenForSection];

    if (req.body.imageUrl !== undefined) {
      if (!data.defaultServiceImages[sectionId]) data.defaultServiceImages[sectionId] = {};
      const url = normalizeImageUrl(req.body.imageUrl);
      if (url) data.defaultServiceImages[sectionId][serviceId] = url;
      else delete data.defaultServiceImages[sectionId][serviceId];
    }

    await writeCatalogData(data);
    res.json({
      hiddenDefaultServices: data.hiddenDefaultServices,
      defaultServiceImages: data.defaultServiceImages,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Update failed' });
  }
};

exports.removeDefaultSubService = async (req, res) => {
  const data = await readCatalogData();
  const sectionId = String(req.params.sectionId || '').trim();
  const serviceId = String(req.params.serviceId || '').trim();
  if (!sectionId || !serviceId) return res.status(400).json({ message: 'Service ids are required' });

  data.hiddenDefaultServices[sectionId] = [
    ...new Set([...(data.hiddenDefaultServices[sectionId] || []), serviceId]),
  ];
  await writeCatalogData(data);
  res.json({ hiddenDefaultServices: data.hiddenDefaultServices });
};
