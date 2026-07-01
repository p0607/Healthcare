const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { validatePassword } = require('../lib/password');
const { toSafeUser } = require('../lib/format');
const { replaceNurseCareOfferings, loadUserWithOfferings } = require('../lib/nurseOfferings');
const { isCaregiverCategory } = require('../lib/caregiverCategories');
const {
  buildPatientProfileData,
  patientProfileCompletion,
} = require('../lib/patientProfile');
const { provisionGuardiansForPatient } = require('../lib/guardianProvisioning');
const {
  dispatchPatientSosAlert,
  collectEmergencyContactRows,
} = require('../lib/sosAlertDispatch');
const { sendMail, isSmtpConfigured } = require('../lib/mail');
const { isValidExpoPushToken } = require('../lib/expoPush');
const {
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  OTP_TTL_MS,
} = require('../lib/passwordResetOtp');

async function loadLinkedGuardian(patientId) {
  const links = await loadLinkedGuardians(patientId);
  return links[0] || null;
}

async function loadLinkedGuardians(patientId) {
  const links = await prisma.guardianPatientLink.findMany({
    where: { patientId },
    include: {
      guardian: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return links.map((l) => l.guardian).filter(Boolean);
}

async function loadLinkedPatients(guardianId) {
  const links = await prisma.guardianPatientLink.findMany({
    where: { guardianId },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          patientFullName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return links.map((l) => l.patient).filter(Boolean);
}

async function assertGuardianLinkedToPatient(guardianId, patientId) {
  const link = await prisma.guardianPatientLink.findFirst({
    where: { guardianId, patientId },
  });
  if (!link) {
    const err = new Error('You are not linked to this patient');
    err.code = 'NOT_LINKED';
    throw err;
  }
  return link;
}

function mapLinkedPatients(patients) {
  return patients.map((p) => ({
    id: p.id,
    _id: p.id,
    name: p.name,
    patientFullName: p.patientFullName,
    email: p.email,
    phone: p.phone,
  }));
}
const {
  normalizeKinds,
  kindsToSessionRoles,
  resolveSessionRole,
  KIND_LABELS,
  userHasKind,
} = require('../lib/accountKinds');
const { inferCaregiverCategory } = require('../lib/registerServices');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  });

/** Base visit display fee: explicit value, else lowest selected sub-service rate. */
function inferVisitRateFromOfferings(careOfferings, visitRate) {
  if (visitRate !== undefined && visitRate !== null && visitRate !== '') {
    return Math.max(0, Math.round(Number(visitRate)) || 0);
  }
  const rates = (careOfferings || [])
    .map((row) => Math.max(0, Math.round(Number(row.rate)) || 0))
    .filter((r) => r > 0);
  if (rates.length === 0) return 0;
  return Math.min(...rates);
}

function buildLoginOptions(user) {
  if (user.role === 'admin') {
    return [{ kind: 'admin', label: KIND_LABELS.admin, sessionRole: 'admin' }];
  }

  const kinds = normalizeKinds(user.accountKinds);
  const effectiveKinds =
    kinds.length > 0
      ? kinds
      : user.role === 'nurse'
        ? ['service_provider']
        : user.role === 'admin'
          ? []
          : ['patient'];

  const options = [];
  if (effectiveKinds.includes('patient')) {
    options.push({ kind: 'patient', label: KIND_LABELS.patient, sessionRole: 'user' });
  }
  if (effectiveKinds.includes('guardian')) {
    options.push({ kind: 'guardian', label: KIND_LABELS.guardian, sessionRole: 'user' });
  }
  if (effectiveKinds.includes('service_provider')) {
    options.push({ kind: 'service_provider', label: KIND_LABELS.service_provider, sessionRole: 'nurse' });
  }
  if (user.role === 'admin') {
    options.push({ kind: 'admin', label: KIND_LABELS.admin, sessionRole: 'admin' });
  }
  return options;
}

function attachAuthMeta(safeUser, user) {
  if (user.role === 'admin') {
    safeUser.role = 'admin';
    safeUser.adminTier = user.adminTier || 'admin';
    safeUser.accountKinds = [];
    safeUser.activeKind = 'admin';
    safeUser.loginOptions = buildLoginOptions(user);
    return safeUser;
  }

  safeUser.accountKinds = normalizeKinds(user.accountKinds);
  if (safeUser.accountKinds.length === 0) {
    if (user.role === 'nurse') safeUser.accountKinds = ['service_provider'];
    else if (user.role !== 'admin') safeUser.accountKinds = ['patient'];
  }
  safeUser.loginOptions = buildLoginOptions(user);
  safeUser.activeKind =
    safeUser.role === 'nurse'
      ? 'service_provider'
      : safeUser.accountKinds.includes('guardian') && !safeUser.accountKinds.includes('patient')
        ? 'guardian'
        : 'patient';
  return safeUser;
}

exports.checkPatientByEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Patient email is required' });
    const patient = await prisma.user.findUnique({ where: { email } });
    if (!patient) {
      return res.json({ exists: false });
    }
    const kinds = normalizeKinds(patient.accountKinds);
    const isPatient =
      kinds.includes('patient') || (kinds.length === 0 && patient.role === 'user');
    if (!isPatient) {
      return res.status(409).json({
        exists: true,
        message: 'This email is registered but not as a patient account',
      });
    }
    return res.json({
      exists: true,
      message: 'Patient account found and will be linked to your guardian profile',
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      accountKinds: accountKindsRaw,
      specialization,
      licenseNumber,
      location,
      visitRate,
      careOfferings,
      caregiverCategory,
      serviceSectionId,
      selectedServiceIds,
      patientDetails,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (String(role || '').toLowerCase() === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be created through registration' });
    }

    const emailNorm = email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    let accountKinds = normalizeKinds(accountKindsRaw);
    if (accountKinds.length === 0) {
      if (role === 'nurse') accountKinds = ['service_provider'];
      else accountKinds = ['patient'];
    }

    const wantsService = accountKinds.includes('service_provider');
    const wantsGuardian = accountKinds.includes('guardian');
    const wantsPatient = accountKinds.includes('patient');

    if (wantsService) {
      if (!Array.isArray(careOfferings) || careOfferings.length === 0) {
        return res.status(400).json({
          message: 'Select at least one sub-service with a rate for your care provider profile',
        });
      }
      const cat =
        caregiverCategory && isCaregiverCategory(caregiverCategory)
          ? caregiverCategory
          : inferCaregiverCategory(selectedServiceIds || []);
      if (!isCaregiverCategory(cat)) {
        return res.status(400).json({ message: 'Invalid caregiver category' });
      }
    }

    if (wantsGuardian) {
      const pEmail = String(patientDetails?.email || '').trim().toLowerCase();
      const pName = String(patientDetails?.name || '').trim();
      if (!pEmail || !pName) {
        return res.status(400).json({
          message: 'Patient full name and email are required for guardian registration',
        });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const [lng, lat] =
      location?.coordinates?.length === 2 ? location.coordinates : [77.5946, 12.9716];

    const sessionRole = wantsService
      ? 'nurse'
      : wantsPatient || wantsGuardian
        ? 'user'
        : 'user';

    const inferredCategory = wantsService
      ? caregiverCategory && isCaregiverCategory(caregiverCategory)
        ? caregiverCategory
        : inferCaregiverCategory(selectedServiceIds || [])
      : null;

    const vr = wantsService ? inferVisitRateFromOfferings(careOfferings, visitRate) : undefined;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email: emailNorm,
          phone,
          password: hashed,
          role: sessionRole,
          accountKinds,
          specialization: wantsService ? specialization : undefined,
          licenseNumber: wantsService ? licenseNumber : undefined,
          lng,
          lat,
          address: location?.address,
          serviceSectionId: wantsService ? serviceSectionId || null : null,
          ...(vr !== undefined ? { visitRate: vr } : {}),
          ...(wantsService && inferredCategory
            ? { caregiverCategory: String(inferredCategory) }
            : {}),
        },
      });

      if (wantsService) {
        await replaceNurseCareOfferings(tx, created.id, careOfferings);
      }

      if (wantsGuardian) {
        const pEmail = patientDetails.email.trim().toLowerCase();
        const pName = patientDetails.name.trim();
        const pPhone = patientDetails.phone?.trim() || null;

        let patient = await tx.user.findUnique({ where: { email: pEmail } });

        if (!patient) {
          patient = await tx.user.create({
            data: {
              name: pName,
              email: pEmail,
              phone: pPhone,
              password: hashed,
              role: 'user',
              accountKinds: ['patient'],
              lng,
              lat,
              address: location?.address,
            },
          });
        } else {
          const pKinds = normalizeKinds(patient.accountKinds);
          if (!pKinds.includes('patient') && patient.role !== 'user') {
            throw Object.assign(new Error('Patient email belongs to a non-patient account'), {
              code: 'PATIENT_EMAIL_CONFLICT',
            });
          }
          if (!pKinds.includes('patient')) {
            await tx.user.update({
              where: { id: patient.id },
              data: { accountKinds: [...new Set([...pKinds, 'patient'])] },
            });
          }
        }

        await tx.guardianPatientLink.upsert({
          where: {
            guardianId_patientId: { guardianId: created.id, patientId: patient.id },
          },
          create: { guardianId: created.id, patientId: patient.id },
          update: {},
        });
      }

      return created;
    });

    const token = signToken(user.id);
    const full = await loadUserWithOfferings(user.id);
    const safe = attachAuthMeta(toSafeUser(full), full);
    if (wantsService && (!safe.careOfferings || safe.careOfferings.length === 0)) {
      return res.status(500).json({
        message:
          'Registration could not save sub-services. Restart the API server and try again.',
      });
    }
    return res.status(201).json({ token, user: safe });
  } catch (err) {
    if (err.code === 'PATIENT_EMAIL_CONFLICT') {
      return res.status(409).json({ message: err.message });
    }
    if (err.code === 'INVALID_OFFERINGS') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role, activeKind } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.accountActive === false) {
      return res.status(403).json({
        message: 'This account has been deactivated. Contact Alchemy support to restore access.',
      });
    }

    if (user.role === 'admin') {
      const token = signToken(user.id);
      const full = await loadUserWithOfferings(user.id);
      const safe = attachAuthMeta(toSafeUser(full), full);
      safe.role = 'admin';
      safe.activeKind = 'admin';
      return res.json({ token, user: safe });
    }

    const loginOptions = buildLoginOptions(user);

    if (loginOptions.length > 1 && !role && !activeKind) {
      return res.json({
        needsRolePick: true,
        loginOptions,
        email: user.email,
      });
    }

    let sessionRole = role;
    if (activeKind === 'guardian' || activeKind === 'patient') sessionRole = 'user';
    if (activeKind === 'service_provider') sessionRole = 'nurse';
    if (activeKind === 'admin') sessionRole = 'admin';

    sessionRole = resolveSessionRole(sessionRole, user.accountKinds);

    if (user.role === 'admin') {
      sessionRole = 'admin';
    } else if (role && user.role !== role) {
      const allowed = kindsToSessionRoles(user.accountKinds);
      if (!allowed.includes(role)) {
        return res.status(403).json({
          message: `This account cannot sign in as ${role}. Choose: ${loginOptions.map((o) => o.label).join(', ')}`,
          loginOptions,
        });
      }
    }

    const token = signToken(user.id);
    const full = await loadUserWithOfferings(user.id);
    const safe = attachAuthMeta(toSafeUser(full), full);
    safe.role = sessionRole;
    if (activeKind) safe.activeKind = activeKind;
    else if (sessionRole === 'nurse') safe.activeKind = 'service_provider';
    else if (safe.accountKinds.includes('guardian') && !safe.accountKinds.includes('patient')) {
      safe.activeKind = 'guardian';
    } else safe.activeKind = 'patient';

    if (safe.role === 'user') {
      const linkedGuardian = await loadLinkedGuardian(full.id);
      safe.linkedGuardian = linkedGuardian;
      safe.profileCompletion = patientProfileCompletion(full, linkedGuardian);
    }
    if (safe.accountKinds?.includes('guardian')) {
      const patients = await loadLinkedPatients(full.id);
      safe.linkedPatients = mapLinkedPatients(patients);
      safe.linkedPatientIds = patients.map((p) => p.id);
    }
    return res.json({ token, user: safe });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  const full = await loadUserWithOfferings(req.user.id);
  const safe = attachAuthMeta(toSafeUser(full), full);
  if (full.role === 'user') {
    const linkedGuardians = await loadLinkedGuardians(full.id);
    safe.linkedGuardians = linkedGuardians;
    safe.linkedGuardian = linkedGuardians[0] || null;
    safe.profileCompletion = patientProfileCompletion(full, safe.linkedGuardian);
  }
  if (safe.accountKinds?.includes('guardian')) {
    const patients = await loadLinkedPatients(full.id);
    safe.linkedPatients = mapLinkedPatients(patients);
    safe.linkedPatientIds = patients.map((p) => p.id);
  }
  return res.json({ user: safe });
};

/** Guardian: list patients linked to this account. */
exports.getLinkedPatients = async (req, res) => {
  try {
    if (!userHasKind(req.user, 'guardian')) {
      return res.status(403).json({ message: 'Only guardian accounts can access linked patients' });
    }
    const patients = await loadLinkedPatients(req.user.id);
    return res.json({ patients: mapLinkedPatients(patients) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/** Guardian: load a linked patient's full profile for editing. */
exports.getLinkedPatientProfile = async (req, res) => {
  try {
    if (!userHasKind(req.user, 'guardian')) {
      return res.status(403).json({ message: 'Only guardian accounts can access linked patients' });
    }
    const patientId = String(req.params.patientId || '').trim();
    if (!patientId) return res.status(400).json({ message: 'Patient id is required' });

    await assertGuardianLinkedToPatient(req.user.id, patientId);
    const patient = await loadUserWithOfferings(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const linkedGuardians = await loadLinkedGuardians(patientId);
    const safe = toSafeUser(patient);
    safe.linkedGuardians = linkedGuardians;
    safe.linkedGuardian = linkedGuardians[0] || null;
    safe.profileCompletion = patientProfileCompletion(patient, safe.linkedGuardian);
    return res.json({ user: safe });
  } catch (err) {
    if (err.code === 'NOT_LINKED') return res.status(403).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

/** Guardian: update a linked patient's healthcare profile. */
exports.updateLinkedPatientProfile = async (req, res) => {
  try {
    if (!userHasKind(req.user, 'guardian')) {
      return res.status(403).json({ message: 'Only guardian accounts can update linked patients' });
    }
    const patientId = String(req.params.patientId || '').trim();
    if (!patientId) return res.status(400).json({ message: 'Patient id is required' });

    await assertGuardianLinkedToPatient(req.user.id, patientId);

    const linkedGuardians = await loadLinkedGuardians(patientId);
    const linkedEmails = new Set(
      linkedGuardians.map((g) => g.email?.toLowerCase()).filter(Boolean)
    );

    if (linkedGuardians.length) {
      const incomingGuardians = req.body?.healthProfile?.guardians || [];
      for (const g of incomingGuardians) {
        const email = String(g?.email || '')
          .trim()
          .toLowerCase();
        if (!email || !linkedEmails.has(email)) continue;
        const existing = linkedGuardians.find((x) => x.email?.toLowerCase() === email);
        if (
          existing &&
          (String(g?.fullName || '').trim() !== existing.name ||
            String(g?.phone || '').trim() !== (existing.phone || ''))
        ) {
          return res.status(409).json({
            message: 'Linked guardian details cannot be changed on the patient profile.',
            code: 'GUARDIAN_ALREADY_LINKED',
          });
        }
      }
    }

    const data = buildPatientProfileData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No profile fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id: patientId },
      data,
    });

    const safe = toSafeUser(updated);
    safe.linkedGuardians = linkedGuardians;
    safe.linkedGuardian = linkedGuardians[0] || null;
    safe.profileCompletion = patientProfileCompletion(updated, safe.linkedGuardian);
    return res.json({ user: safe, message: 'Patient profile saved' });
  } catch (err) {
    if (err.code === 'NOT_LINKED') return res.status(403).json({ message: err.message });
    if (['INVALID_GENDER', 'INVALID_RELATIONSHIP', 'INVALID_DOB'].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Could not save patient profile' });
  }
};

/** Guardian: update own account (name, phone) and patient-kind toggle. */
exports.updateGuardianAccount = async (req, res) => {
  try {
    if (!userHasKind(req.user, 'guardian')) {
      return res.status(403).json({ message: 'Only guardian accounts can use this endpoint' });
    }

    const data = {};
    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: 'Name cannot be empty' });
      data.name = name;
    }
    if (req.body?.phone !== undefined) {
      data.phone = String(req.body.phone || '').trim() || null;
    }

    if (typeof req.body?.alsoPatient === 'boolean') {
      let kinds = normalizeKinds(req.user.accountKinds);
      if (!kinds.includes('guardian')) kinds.push('guardian');
      if (req.body.alsoPatient) {
        if (!kinds.includes('patient')) kinds.push('patient');
      } else {
        kinds = kinds.filter((k) => k !== 'patient');
      }
      data.accountKinds = kinds;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No account fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    const full = await loadUserWithOfferings(updated.id);
    const safe = attachAuthMeta(toSafeUser(full), full);
    if (safe.accountKinds?.includes('guardian')) {
      const patients = await loadLinkedPatients(full.id);
      safe.linkedPatients = mapLinkedPatients(patients);
      safe.linkedPatientIds = patients.map((p) => p.id);
    }
    return res.json({ user: safe, message: 'Account updated' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not update account' });
  }
};

exports.getPatientGuardian = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only patient accounts can access this' });
    }
    const linkedGuardians = await loadLinkedGuardians(req.user.id);
    return res.json({
      linked: linkedGuardians.length > 0,
      guardians: linkedGuardians,
      guardian: linkedGuardians[0] || null,
      message: linkedGuardians.length ? 'Guardian account(s) linked' : null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updatePatientProfile = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only patient accounts can update this profile' });
    }

    const linkedGuardians = await loadLinkedGuardians(req.user.id);
    const linkedEmails = new Set(
      linkedGuardians.map((g) => g.email?.toLowerCase()).filter(Boolean)
    );

    if (linkedGuardians.length) {
      const incomingGuardians = req.body?.healthProfile?.guardians || [];
      for (const g of incomingGuardians) {
        const email = String(g?.email || '')
          .trim()
          .toLowerCase();
        if (!email || !linkedEmails.has(email)) continue;
        const existing = linkedGuardians.find((x) => x.email?.toLowerCase() === email);
        if (
          existing &&
          (String(g?.fullName || '').trim() !== existing.name ||
            String(g?.phone || '').trim() !== (existing.phone || ''))
        ) {
          return res.status(409).json({
            message: 'Linked guardian details cannot be changed here. Ask them to update their profile after login.',
            code: 'GUARDIAN_ALREADY_LINKED',
            linkedGuardian: existing,
            linkedGuardians,
          });
        }
      }
    }

    const data = buildPatientProfileData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No profile fields to update' });
    }
    if (data.name === null) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }

    const { updated, provisionedGuardians } = await prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: req.user.id },
        data,
      });
      let provisioned = [];
      const guardians = data.healthProfile?.guardians;
      if (Array.isArray(guardians) && guardians.length) {
        provisioned = await provisionGuardiansForPatient(tx, req.user.id, guardians, saved);
      }
      return { updated: saved, provisionedGuardians: provisioned };
    });

    const freshLinked = await loadLinkedGuardians(req.user.id);
    const safe = toSafeUser(updated);
    safe.linkedGuardians = freshLinked;
    safe.linkedGuardian = freshLinked[0] || null;
    safe.profileCompletion = patientProfileCompletion(updated, safe.linkedGuardian);
    return res.json({
      user: safe,
      message: 'Profile saved',
      provisionedGuardians: provisionedGuardians.filter((g) => g.linked && !g.error),
    });
  } catch (err) {
    if (['INVALID_GENDER', 'INVALID_RELATIONSHIP', 'INVALID_DOB'].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    console.error('updatePatientProfile failed:', err);
    return res.status(500).json({ message: err.message || 'Could not save profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError.replace('password', 'New password') });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(String(currentPassword), user.password);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not change password' });
  }
};

const FORGOT_PASSWORD_OK_MESSAGE =
  'If an account exists for that email, a verification code has been sent.';

exports.requestPasswordResetOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.accountActive !== false) {
      const { otp } = await createPasswordResetOtp(email);
      const minutes = Math.max(1, Math.round(OTP_TTL_MS / 60000));
      const mailResult = await sendMail({
        to: email,
        subject: '911 — password reset code',
        text:
          `Your password reset code is ${otp}.\n\n` +
          `It expires in ${minutes} minutes. If you did not request this, ignore this email.`,
        html:
          `<p>Your password reset code is <strong>${otp}</strong>.</p>` +
          `<p>It expires in ${minutes} minutes. If you did not request this, ignore this email.</p>`,
      });

      console.log(`[password-reset] email=${email} otp=${otp} delivered=${mailResult.delivered}`);

      const payload = { message: FORGOT_PASSWORD_OK_MESSAGE, emailSent: mailResult.delivered };

      // Local dev without SMTP — show code in the app instead of inbox.
      if (!mailResult.delivered && process.env.NODE_ENV !== 'production') {
        payload.devOtp = otp;
        payload.devNote =
          'Email is not configured on this server. Use the code shown below (also printed in the backend terminal).';
      }

      if (!mailResult.delivered && process.env.NODE_ENV === 'production') {
        payload.message =
          'Could not send email right now. Contact support or try again later.';
        return res.status(503).json(payload);
      }

      return res.json(payload);
    }

    return res.json({ message: FORGOT_PASSWORD_OK_MESSAGE, emailSent: false });
  } catch (err) {
    console.error('requestPasswordResetOtp failed:', err);
    return res.status(500).json({ message: err.message || 'Could not send reset code' });
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    const newPassword = req.body?.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError.replace('password', 'New password') });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification code or email' });
    }
    if (user.accountActive === false) {
      return res.status(403).json({ message: 'This account is deactivated' });
    }

    const verified = await verifyPasswordResetOtp(email, otp);
    if (!verified.ok) {
      const messages = {
        expired: 'Verification code expired. Request a new one.',
        locked: 'Too many attempts. Request a new code.',
        mismatch: 'Invalid verification code',
        missing: 'Invalid verification code or email',
        invalid: 'Invalid verification code',
      };
      return res.status(400).json({ message: messages[verified.reason] || 'Invalid verification code' });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return res.json({ message: 'Password reset successfully. You can sign in with your new password.' });
  } catch (err) {
    console.error('resetPasswordWithOtp failed:', err);
    return res.status(500).json({ message: err.message || 'Could not reset password' });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to deactivate your account' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ message: 'Password is incorrect' });

    await prisma.user.update({
      where: { id: user.id },
      data: { accountActive: false, available: false },
    });
    return res.json({ message: 'Account deactivated. You will be signed out.' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not deactivate account' });
  }
};

/** Patient slid the emergency control — notify guardians, admins, and emergency contacts. */
exports.triggerEmergencyAlert = async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only patient accounts can trigger emergency alerts' });
    }

    const patient = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!patient) return res.status(404).json({ message: 'User not found' });

    const linkedGuardians = await loadLinkedGuardians(patient.id);
    const contactRows = collectEmergencyContactRows(patient);
    const io = req.app.get('io');
    const result = await dispatchPatientSosAlert({ prisma, io, patient });

    const notified = result.notifiedSocket > 0 || result.pushSent > 0;

    return res.json({
      ok: true,
      notified,
      notifiedSocket: result.notifiedSocket,
      pushSent: result.pushSent,
      guardian: linkedGuardians[0]
        ? { id: linkedGuardians[0].id, name: linkedGuardians[0].name, email: linkedGuardians[0].email }
        : null,
      guardians: result.guardians,
      admins: result.admins,
      emergencyContacts: result.emergencyContacts,
      registeredContacts: result.registeredContacts,
      offlineContacts: result.offlineContacts,
      recipients: result.recipients,
      alert: result.payload,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not send emergency alert' });
  }
};

/** Save Expo push token so SOS alerts reach the device when the app is in background. */
exports.registerPushToken = async (req, res) => {
  try {
    const pushToken = String(req.body?.token || req.body?.expoPushToken || '').trim();
    if (!pushToken) {
      return res.status(400).json({ message: 'Push token is required' });
    }
    if (!isValidExpoPushToken(pushToken)) {
      return res.status(400).json({ message: 'Invalid Expo push token format' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { expoPushToken: pushToken },
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not save push token' });
  }
};
