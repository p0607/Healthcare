const { parseHealthProfile } = require('./patientProfile');
const { normalizeEmergencyContacts } = require('./emergencyContacts');
const { sendExpoPushBatch } = require('./expoPush');
const {
  SOS_SOCKET_EVENT,
  SOS_LEGACY_GUARDIAN_EVENT,
} = {
  SOS_SOCKET_EVENT: 'sos:emergency_alert',
  SOS_LEGACY_GUARDIAN_EVENT: 'guardian:emergency_alert',
};

function trimEmail(v) {
  return String(v ?? '').trim().toLowerCase();
}

function collectEmergencyContactRows(patient) {
  const hp = parseHealthProfile(patient.healthProfile, patient.id);
  const rows = [];

  for (const c of hp.emergencyContacts || []) {
    const name = String(c.fullName || c.name || '').trim();
    const phone = String(c.primaryPhone || c.phone || '').trim();
    const email = trimEmail(c.email);
    if (name || phone || email) rows.push({ name, phone, email });
  }

  for (const c of normalizeEmergencyContacts(patient.emergencyContacts)) {
    const name = String(c.name || '').trim();
    const phone = String(c.phone || '').trim();
    const email = trimEmail(c.email);
    if (name || phone || email) rows.push({ name, phone, email });
  }

  const seen = new Set();
  return rows.filter((r) => {
    const key = r.email || `${r.phone}|${r.name}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return Boolean(r.name && r.phone);
  });
}

async function loadLinkedGuardians(prisma, patientId) {
  const links = await prisma.guardianPatientLink.findMany({
    where: { patientId },
    include: {
      guardian: {
        select: { id: true, name: true, email: true, phone: true, expoPushToken: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return links.map((l) => l.guardian).filter(Boolean);
}

async function loadAdmins(prisma) {
  return prisma.user.findMany({
    where: { role: 'admin', accountActive: true },
    select: { id: true, name: true, email: true, phone: true, expoPushToken: true },
  });
}

async function lookupUsersByEmails(prisma, emails, excludeIds = new Set()) {
  const unique = [...new Set(emails.filter(Boolean))];
  if (!unique.length) return [];
  const users = await prisma.user.findMany({
    where: { email: { in: unique }, accountActive: true },
    select: { id: true, name: true, email: true, phone: true, role: true, expoPushToken: true },
  });
  return users.filter((u) => !excludeIds.has(u.id));
}

/**
 * Notify guardians, admins, and registered emergency contacts about a patient SOS.
 */
async function dispatchPatientSosAlert({ prisma, io, patient }) {
  const patientName = patient.patientFullName?.trim() || patient.name;
  const payload = {
    type: 'patient_emergency',
    patientId: patient.id,
    patientName,
    message: `${patientName} triggered the emergency button.`,
    address: patient.address || null,
    coordinates: [patient.lng, patient.lat],
    at: new Date().toISOString(),
    action: 'book_emergency',
  };

  const guardians = await loadLinkedGuardians(prisma, patient.id);
  const admins = await loadAdmins(prisma);
  const contactRows = collectEmergencyContactRows(patient);

  const guardianIds = new Set(guardians.map((g) => g.id));
  const contactEmails = contactRows.map((c) => c.email).filter(Boolean);
  const contactUsers = await lookupUsersByEmails(prisma, contactEmails, guardianIds);

  const socketRecipients = new Map();
  const pushTokens = new Set();

  const addRecipient = (user, role) => {
    if (!user?.id) return;
    socketRecipients.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    });
    if (user.expoPushToken) pushTokens.add(user.expoPushToken);
  };

  for (const g of guardians) addRecipient(g, 'guardian');
  for (const a of admins) addRecipient(a, 'admin');
  for (const u of contactUsers) addRecipient(u, 'emergency_contact');

  const offlineContacts = contactRows.filter(
    (c) => !c.email || !contactUsers.some((u) => trimEmail(u.email) === c.email)
  );

  if (io) {
    for (const id of socketRecipients.keys()) {
      io.to(`user:${id}`).emit(SOS_SOCKET_EVENT, payload);
      io.to(`user:${id}`).emit(SOS_LEGACY_GUARDIAN_EVENT, payload);
    }
    io.to('admins').emit(SOS_SOCKET_EVENT, payload);
  }

  const pushMessages = [...pushTokens].map((token) => ({
    to: token,
    sound: 'default',
    priority: 'high',
    channelId: 'emergency-sos',
    title: `SOS — ${patientName}`,
    body: payload.message,
    data: {
      type: 'patient_emergency',
      patientId: patient.id,
      action: 'book_emergency',
    },
  }));

  let pushSent = 0;
  if (pushMessages.length) {
    pushSent = await sendExpoPushBatch(pushMessages);
  }

  return {
    payload,
    notifiedSocket: socketRecipients.size,
    pushSent,
    guardians: guardians.map((g) => ({ id: g.id, name: g.name, email: g.email })),
    admins: admins.map((a) => ({ id: a.id, name: a.name, email: a.email })),
    emergencyContacts: contactRows,
    registeredContacts: contactUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
    offlineContacts,
    recipients: [...socketRecipients.values()],
  };
}

function hasAnySosRecipient(patient, guardians, contactRows) {
  if (guardians.length) return true;
  if (contactRows.some((c) => c.name && c.phone)) return true;
  if (patient.guardianContactPhone || patient.guardianContactEmail) return true;
  return true; // admins always receive alerts
}

module.exports = {
  dispatchPatientSosAlert,
  collectEmergencyContactRows,
  hasAnySosRecipient,
};
