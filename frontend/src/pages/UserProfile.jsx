import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import ProfileCompletionTimeline from '../components/ProfileCompletionTimeline.jsx';
import ProfileCompletionPie from '../components/ProfileCompletionPie.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion.jsx';
import {
  ALLERGY_SEVERITY_OPTIONS,
  ALCOHOL_USE_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  MAX_EMERGENCY_CONTACTS,
  MIN_EMERGENCY_CONTACTS,
  POLICY_HOLDER_RELATION_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  TOBACCO_USE_OPTIONS,
  WORK_SCHEDULE_OPTIONS,
  buildGuardianProfileTabs,
  buildHealthProfilePayload,
  emptyAllergy,
  emptyEmergencyContact,
  emptyGuardian,
  emptyInsurancePolicy,
  emptyMedication,
  formFromUser,
  isGuardianSession,
  isPatientSession,
  patientProfileCompletion,
  visibleEmergencyContactCount,
} from '../lib/patientProfile';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import GuardianAccountPanel from '../components/GuardianAccountPanel.jsx';

const GRID_3 = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-foreground/90 mb-1">{label}</label>
    {children}
  </div>
);

function stepStatusBadge(step) {
  if (step?.status === 'complete') {
    return <span className="text-xs font-medium text-emerald-400">Complete</span>;
  }
  return <span className="text-xs font-medium text-rose-400">Pending</span>;
}

const UserProfile = () => {
  const { user, setUser } = useAuth();
  const isGuardian = isGuardianSession(user);
  const [activeTab, setActiveTab] = useState('self');
  const [linkedPatients, setLinkedPatients] = useState(() =>
    Array.isArray(user?.linkedPatients) ? user.linkedPatients : []
  );
  const [profileSubject, setProfileSubject] = useState(user);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => formFromUser(user));
  const [openSection, setOpenSection] = useState('demographics');
  const [linkedGuardians, setLinkedGuardians] = useState(() =>
    Array.isArray(user?.linkedGuardians) ? user.linkedGuardians : user?.linkedGuardian ? [user.linkedGuardian] : []
  );
  const linkedGuardian = linkedGuardians[0] || null;
  const linkedEmails = useMemo(
    () => new Set(linkedGuardians.map((g) => String(g.email || '').toLowerCase()).filter(Boolean)),
    [linkedGuardians]
  );
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const sectionRefs = useRef({});
  const hp = form.healthProfile;

  const isPatient = isPatientSession(user);
  const profileTabs = useMemo(
    () => (isGuardian ? buildGuardianProfileTabs(user, linkedPatients) : []),
    [isGuardian, user, linkedPatients]
  );

  useEffect(() => {
    if (!isGuardian || !profileTabs.length) return;
    if (!profileTabs.some((t) => t.id === activeTab)) {
      setActiveTab(profileTabs[0].id);
    }
  }, [profileTabs, activeTab, isGuardian]);

  const activePatientId = activeTab.startsWith('patient:') ? activeTab.replace('patient:', '') : null;
  const profilePanel = useMemo(() => {
    if (!isGuardian) return 'health';
    if (activeTab === 'self') return 'guardian-account';
    if (activeTab === 'my-patient') return 'health';
    if (activePatientId) return 'health';
    return 'guardian-account';
  }, [isGuardian, activeTab, activePatientId]);

  useEffect(() => {
    if (!isGuardian) {
      setProfileSubject(user);
      setForm(formFromUser(user, linkedGuardian));
    }
  }, [user, isGuardian, linkedGuardian]);

  useEffect(() => {
    if (!isGuardian) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me/patients');
        if (!cancelled) setLinkedPatients(data.patients || []);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuardian]);

  useEffect(() => {
    if (!isGuardian || activeTab === 'self') return undefined;
    if (activeTab === 'my-patient') {
      setLoadingProfile(false);
      setProfileSubject(user);
      setForm(formFromUser(user, linkedGuardian));
      setOpenSection('demographics');
      return undefined;
    }
    if (!activePatientId) return undefined;
    let cancelled = false;
    setLoadingProfile(true);
    setOpenSection('demographics');
    (async () => {
      try {
        const { data } = await api.get(`/auth/me/patients/${activePatientId}`);
        if (cancelled) return;
        const subject = data.user;
        setProfileSubject(subject);
        const lg = subject?.linkedGuardians?.length
          ? subject.linkedGuardians
          : subject?.linkedGuardian
            ? [subject.linkedGuardian]
            : [];
        setForm(formFromUser(subject, lg[0]));
      } catch (err) {
        if (!cancelled) toast.error(err?.response?.data?.message || 'Could not load patient profile');
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activePatientId, isGuardian, user, linkedGuardian]);

  const loadGuardianLink = useCallback(async () => {
    if (!isPatient) return;
    try {
      const { data } = await api.get('/auth/me/guardian');
      const list = data.guardians?.length ? data.guardians : data.guardian ? [data.guardian] : [];
      if (list.length) {
        setLinkedGuardians(list);
        if (data.guardian) setGuardianModalOpen(true);
      }
    } catch {
      /* optional */
    }
  }, [isPatient]);

  useEffect(() => {
    loadGuardianLink();
  }, [loadGuardianLink]);

  const completion = useMemo(
    () =>
      patientProfileCompletion(
        {
          ...profileSubject,
          ...form,
          healthProfile: hp,
          location: { address: form.address },
          emergencyContacts: hp?.emergencyContacts,
        },
        linkedGuardian
      ),
    [profileSubject, form, hp, linkedGuardian]
  );

  const stepById = useMemo(
    () => Object.fromEntries((completion?.fields || []).map((f) => [f.key, f])),
    [completion]
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setDemo = (key, value) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        demographics: { ...f.healthProfile.demographics, [key]: value },
      },
    }));

  const setDemoContact = (key, value) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        demographics: {
          ...f.healthProfile.demographics,
          contact: { ...f.healthProfile.demographics.contact, [key]: value },
        },
      },
    }));

  const setNested = (section, key, value) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        [section]: { ...f.healthProfile[section], [key]: value },
      },
    }));

  const setLifestyle = (key, value) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        employmentAndLifestyle: {
          ...f.healthProfile.employmentAndLifestyle,
          lifestyleFactors: {
            ...f.healthProfile.employmentAndLifestyle.lifestyleFactors,
            [key]: value,
          },
        },
      },
    }));

  const updateListItem = (section, index, patch) =>
    setForm((f) => {
      const list = [...(f.healthProfile[section] || [])];
      list[index] = { ...list[index], ...patch };
      return { ...f, healthProfile: { ...f.healthProfile, [section]: list } };
    });

  const addListItem = (section, factory) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        [section]: [...(f.healthProfile[section] || []), factory()],
      },
    }));

  const removeListItem = (section, index) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        [section]: (f.healthProfile[section] || []).filter((_, i) => i !== index),
      },
    }));

  const scrollToStep = (stepId) => {
    setOpenSection(stepId);
    requestAnimationFrame(() => {
      sectionRefs.current[stepId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = buildHealthProfilePayload(form, profileSubject?._id || profileSubject?.id);
      const payload = {
        ...base,
        location: {
          address: form.address,
          ...(profileSubject?.location?.coordinates?.length === 2
            ? { coordinates: profileSubject.location.coordinates }
            : user?.location?.coordinates?.length === 2
              ? { coordinates: user.location.coordinates }
              : {}),
        },
      };
      if (!linkedGuardian && hp.guardians?.[0]) {
        payload.guardianContactName = hp.guardians[0].fullName;
        payload.guardianContactEmail = hp.guardians[0].email;
        payload.guardianContactPhone = hp.guardians[0].phone;
      }

      let data;
      if (isGuardian && activePatientId) {
        ({ data } = await api.patch(`/auth/me/patients/${activePatientId}/profile`, payload));
      } else {
        ({ data } = await api.patch('/auth/me/profile', payload));
        if (activeTab === 'my-patient' || !isGuardian) {
          setUser(data.user);
          localStorage.setItem('nc_user', JSON.stringify(data.user));
        }
      }

      if (data.user) {
        setProfileSubject(data.user);
        if (data.user?.linkedGuardians?.length) setLinkedGuardians(data.user.linkedGuardians);
        else if (data.user?.linkedGuardian) setLinkedGuardians([data.user.linkedGuardian]);
      }
      if (Array.isArray(data.provisionedGuardians) && data.provisionedGuardians.length) {
        const created = data.provisionedGuardians.filter((g) => g.created && g.temporaryPassword);
        if (created.length) {
          const lines = created.map(
            (g) => `${g.name} (${g.email}) — temp password: ${g.temporaryPassword}`
          );
          toast.success(
            `Guardian account${created.length > 1 ? 's' : ''} created. Share login details:\n${lines.join('\n')}`,
            { duration: 12000 }
          );
        } else {
          toast.success('Guardian account linked');
        }
      } else {
        toast.success('Profile saved');
      }
    } catch (err) {
      if (err?.response?.data?.code === 'GUARDIAN_ALREADY_LINKED') {
        setLinkedGuardians([err.response.data.linkedGuardian].filter(Boolean));
        setGuardianModalOpen(true);
      } else {
        toast.error(err?.response?.data?.message || 'Could not save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (index, patch) =>
    setForm((f) => {
      const policies = [...(f.healthProfile.insuranceDetails.policies || [])];
      policies[index] = { ...policies[index], ...patch };
      return {
        ...f,
        healthProfile: {
          ...f.healthProfile,
          insuranceDetails: { ...f.healthProfile.insuranceDetails, policies },
        },
      };
    });

  const updateAllergy = (index, patch) =>
    setForm((f) => {
      const allergies = [...(f.healthProfile.medicalBaseline.allergies || [])];
      allergies[index] = { ...allergies[index], ...patch };
      return {
        ...f,
        healthProfile: {
          ...f.healthProfile,
          medicalBaseline: { ...f.healthProfile.medicalBaseline, allergies },
        },
      };
    });

  const updateMedication = (index, patch) =>
    setForm((f) => {
      const currentMedications = [...(f.healthProfile.medicalBaseline.currentMedications || [])];
      currentMedications[index] = { ...currentMedications[index], ...patch };
      return {
        ...f,
        healthProfile: {
          ...f.healthProfile,
          medicalBaseline: { ...f.healthProfile.medicalBaseline, currentMedications },
        },
      };
    });

  const emergencyCount = visibleEmergencyContactCount(hp.emergencyContacts);
  const guardians = hp.guardians?.length ? hp.guardians : [emptyGuardian()];
  const policies =
    hp.insuranceDetails?.policies?.length ? hp.insuranceDetails.policies : [emptyInsurancePolicy()];

  const accordionItems = [
    {
      value: 'demographics',
      title: 'Demographics',
      content: (
        <div className="space-y-4">
          <div className={GRID_3}>
            <Field label="Legal first name *">
              <input className="input" value={hp.demographics.legalFirstName} onChange={(e) => setDemo('legalFirstName', e.target.value)} />
            </Field>
            <Field label="Legal last name *">
              <input className="input" value={hp.demographics.legalLastName} onChange={(e) => setDemo('legalLastName', e.target.value)} />
            </Field>
            <Field label="Preferred name">
              <input className="input" value={hp.demographics.preferredName} onChange={(e) => setDemo('preferredName', e.target.value)} />
            </Field>
            <Field label="Date of birth *">
              <input type="date" className="input" value={hp.demographics.dateOfBirth} onChange={(e) => setDemo('dateOfBirth', e.target.value)} />
            </Field>
            <Field label="Sex assigned at birth *">
              <select className="input" value={hp.demographics.sexAssignedAtBirth} onChange={(e) => setDemo('sexAssignedAtBirth', e.target.value)}>
                <option value="">Select</option>
                {SEX_AT_BIRTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Gender identity">
              <input className="input" value={hp.demographics.genderIdentity} onChange={(e) => setDemo('genderIdentity', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="input" inputMode="tel" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Email">
              <input className="input opacity-70" value={form.email} readOnly disabled />
            </Field>
            <Field label="Home address *" className="lg:col-span-3">
              <textarea className="input min-h-[80px]" value={form.address} onChange={set('address')} placeholder="Address for home visits" />
            </Field>
          </div>
        </div>
      ),
    },
    {
      value: 'guardians',
      title: 'Guardians',
      content: (
        <div className="space-y-4">
          <p className="text-xs text-muted">Required for minors. Supports multiple guardians. When name, phone, and email are saved, a guardian login is created with a temporary password.</p>
          {linkedGuardians.length ? (
            <p className="text-xs text-emerald-400">Linked guardian account(s) — those rows are read-only.</p>
          ) : null}
          {guardians.map((g, i) => {
            const rowLinked = linkedEmails.has(String(g.email || '').toLowerCase());
            return (
            <div key={i} className="rounded-xl border border-glass-border/50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">Guardian {i + 1}</p>
                {!rowLinked && guardians.length > 1 ? (
                  <button type="button" onClick={() => removeListItem('guardians', i)} className="text-rose-400 text-xs inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                ) : null}
              </div>
              <div className={GRID_3}>
                <Field label="Full name *">
                  <input className="input" value={g.fullName} disabled={rowLinked} onChange={(e) => updateListItem('guardians', i, { fullName: e.target.value })} />
                </Field>
                <Field label="Relationship *">
                  <input className="input" value={g.relationshipToUser} disabled={rowLinked} onChange={(e) => updateListItem('guardians', i, { relationshipToUser: e.target.value })} placeholder="Mother, Legal Guardian…" />
                </Field>
                <Field label="Phone *">
                  <input className="input" value={g.phone} disabled={rowLinked} onChange={(e) => updateListItem('guardians', i, { phone: e.target.value })} />
                </Field>
                <Field label="Email *">
                  <input type="email" className="input" value={g.email} disabled={rowLinked} onChange={(e) => updateListItem('guardians', i, { email: e.target.value })} />
                </Field>
                <Field label="Medical decision authority" className="lg:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(g.hasMedicalDecisionMakingAuthority)} disabled={rowLinked} onChange={(e) => updateListItem('guardians', i, { hasMedicalDecisionMakingAuthority: e.target.checked })} />
                    Can consent to procedures
                  </label>
                </Field>
              </div>
            </div>
          );})}
          {!linkedGuardians.length ? (
            <button type="button" className="text-sm text-brand-400 inline-flex items-center gap-1" onClick={() => addListItem('guardians', emptyGuardian)}>
              <Plus className="w-4 h-4" /> Add guardian
            </button>
          ) : null}
        </div>
      ),
    },
    {
      value: 'emergencyContacts',
      title: 'Emergency contacts',
      content: (
        <div className="space-y-4">
          <p className="text-xs text-muted">Up to {MAX_EMERGENCY_CONTACTS} contacts with call priority (1 = first).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: emergencyCount }, (_, i) => {
              const c = hp.emergencyContacts[i] || emptyEmergencyContact(i + 1);
              return (
                <div key={i} className="rounded-xl border border-glass-border/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted">Contact {i + 1}{i < MIN_EMERGENCY_CONTACTS ? ' · required' : ''}</p>
                  <Field label="Full name *">
                    <input className="input !py-2 !text-sm" value={c.fullName} onChange={(e) => updateListItem('emergencyContacts', i, { fullName: e.target.value })} />
                  </Field>
                  <Field label="Relationship *">
                    <input className="input !py-2 !text-sm" value={c.relationship} onChange={(e) => updateListItem('emergencyContacts', i, { relationship: e.target.value })} />
                  </Field>
                  <Field label="Primary phone *">
                    <input className="input !py-2 !text-sm" value={c.primaryPhone} onChange={(e) => updateListItem('emergencyContacts', i, { primaryPhone: e.target.value })} />
                  </Field>
                  <Field label="Priority *">
                    <input type="number" min={1} max={5} className="input !py-2 !text-sm" value={c.priorityOrder || i + 1} onChange={(e) => updateListItem('emergencyContacts', i, { priorityOrder: Number(e.target.value) })} />
                  </Field>
                  <Field label="Secondary phone">
                    <input className="input !py-2 !text-sm" value={c.secondaryPhone} onChange={(e) => updateListItem('emergencyContacts', i, { secondaryPhone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className="input !py-2 !text-sm" value={c.email} onChange={(e) => updateListItem('emergencyContacts', i, { email: e.target.value })} />
                  </Field>
                </div>
              );
            })}
          </div>
          {emergencyCount < MAX_EMERGENCY_CONTACTS ? (
            <button type="button" className="text-sm text-brand-400 inline-flex items-center gap-1" onClick={() => addListItem('emergencyContacts', () => emptyEmergencyContact(emergencyCount + 1))}>
              <Plus className="w-4 h-4" /> Add contact
            </button>
          ) : null}
        </div>
      ),
    },
    {
      value: 'medicalBaseline',
      title: 'Medical baseline',
      content: (
        <div className="space-y-6">
          <Field label="Blood type">
            <select className="input max-w-xs" value={hp.medicalBaseline.bloodType} onChange={(e) => setNested('medicalBaseline', 'bloodType', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_TYPE_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <div>
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-semibold">Allergies</h3>
              <button type="button" className="text-xs text-brand-400 inline-flex items-center gap-1" onClick={() => setNested('medicalBaseline', 'allergies', [...(hp.medicalBaseline.allergies || []), emptyAllergy()])}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {(hp.medicalBaseline.allergies.length ? hp.medicalBaseline.allergies : [emptyAllergy()]).map((a, i) => (
              <div key={i} className={`${GRID_3} mb-3`}>
                <Field label="Allergen"><input className="input" value={a.allergen} onChange={(e) => updateAllergy(i, { allergen: e.target.value })} /></Field>
                <Field label="Severity">
                  <select className="input" value={a.severity} onChange={(e) => updateAllergy(i, { severity: e.target.value })}>
                    <option value="">Select</option>
                    {ALLERGY_SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Reaction"><input className="input" value={a.reaction} onChange={(e) => updateAllergy(i, { reaction: e.target.value })} /></Field>
              </div>
            ))}
          </div>
          <Field label="Chronic conditions (comma-separated)">
            <input className="input" value={(hp.medicalBaseline.chronicConditions || []).join(', ')} onChange={(e) => setNested('medicalBaseline', 'chronicConditions', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Diabetes, Hypertension" />
          </Field>
          <div>
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-semibold">Current medications</h3>
              <button type="button" className="text-xs text-brand-400" onClick={() => setNested('medicalBaseline', 'currentMedications', [...hp.medicalBaseline.currentMedications, emptyMedication()])}>+ Add</button>
            </div>
            {hp.medicalBaseline.currentMedications.map((m, i) => (
              <div key={i} className={`${GRID_3} mb-3`}>
                <Field label="Name"><input className="input" value={m.name} onChange={(e) => updateMedication(i, { name: e.target.value })} /></Field>
                <Field label="Dosage"><input className="input" value={m.dosage} onChange={(e) => updateMedication(i, { dosage: e.target.value })} /></Field>
                <Field label="Frequency"><input className="input" value={m.frequency} onChange={(e) => updateMedication(i, { frequency: e.target.value })} /></Field>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      value: 'employmentAndLifestyle',
      title: 'Employment & lifestyle',
      content: (
        <div className={GRID_3}>
          <Field label="Employment status">
            <select className="input" value={hp.employmentAndLifestyle.employmentStatus} onChange={(e) => setNested('employmentAndLifestyle', 'employmentStatus', e.target.value)}>
              <option value="">Select</option>
              {EMPLOYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Occupation"><input className="input" value={hp.employmentAndLifestyle.occupation} onChange={(e) => setNested('employmentAndLifestyle', 'occupation', e.target.value)} /></Field>
          <Field label="Work schedule">
            <select className="input" value={hp.employmentAndLifestyle.workSchedule} onChange={(e) => setNested('employmentAndLifestyle', 'workSchedule', e.target.value)}>
              <option value="">Select</option>
              {WORK_SCHEDULE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tobacco use">
            <select className="input" value={hp.employmentAndLifestyle.lifestyleFactors.tobaccoUse} onChange={(e) => setLifestyle('tobaccoUse', e.target.value)}>
              <option value="">Select</option>
              {TOBACCO_USE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Alcohol use">
            <select className="input" value={hp.employmentAndLifestyle.lifestyleFactors.alcoholUse} onChange={(e) => setLifestyle('alcoholUse', e.target.value)}>
              <option value="">Select</option>
              {ALCOHOL_USE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      ),
    },
    {
      value: 'insuranceDetails',
      title: 'Insurance',
      content: (
        <div className="space-y-4">
          <Field label="Do you have insurance? *">
            <select
              className="input max-w-xs"
              value={hp.insuranceDetails.hasInsurance === null ? '' : hp.insuranceDetails.hasInsurance ? 'yes' : 'no'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  healthProfile: {
                    ...f.healthProfile,
                    insuranceDetails: {
                      ...f.healthProfile.insuranceDetails,
                      hasInsurance: e.target.value === '' ? null : e.target.value === 'yes',
                    },
                  },
                }))
              }
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
          {hp.insuranceDetails.hasInsurance ? (
            <>
              {policies.map((p, i) => (
                <div key={i} className="rounded-xl border border-glass-border/50 p-4 space-y-3">
                  <p className="text-sm font-semibold">Policy {i + 1}</p>
                  <div className={GRID_3}>
                    <Field label="Provider name *"><input className="input" value={p.providerName} onChange={(e) => updatePolicy(i, { providerName: e.target.value })} /></Field>
                    <Field label="Plan name"><input className="input" value={p.planName} onChange={(e) => updatePolicy(i, { planName: e.target.value })} /></Field>
                    <Field label="Policy ID *"><input className="input font-mono text-sm" value={p.policyId} onChange={(e) => updatePolicy(i, { policyId: e.target.value })} /></Field>
                    <Field label="Group ID"><input className="input font-mono text-sm" value={p.groupId} onChange={(e) => updatePolicy(i, { groupId: e.target.value })} /></Field>
                    <Field label="Primary holder">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={Boolean(p.isPrimaryHolder)} onChange={(e) => updatePolicy(i, { isPrimaryHolder: e.target.checked })} />
                        I am the primary holder
                      </label>
                    </Field>
                  </div>
                  {!p.isPrimaryHolder ? (
                    <div className={GRID_3}>
                      <Field label="Holder full name"><input className="input" value={p.primaryHolderDetails?.fullName} onChange={(e) => updatePolicy(i, { primaryHolderDetails: { ...p.primaryHolderDetails, fullName: e.target.value } })} /></Field>
                      <Field label="Relationship">
                        <select className="input" value={p.primaryHolderDetails?.relationshipToUser} onChange={(e) => updatePolicy(i, { primaryHolderDetails: { ...p.primaryHolderDetails, relationshipToUser: e.target.value } })}>
                          <option value="">Select</option>
                          {POLICY_HOLDER_RELATION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                      <Field label="Holder DOB"><input type="date" className="input" value={p.primaryHolderDetails?.dateOfBirth} onChange={(e) => updatePolicy(i, { primaryHolderDetails: { ...p.primaryHolderDetails, dateOfBirth: e.target.value } })} /></Field>
                    </div>
                  ) : null}
                </div>
              ))}
              <button type="button" className="text-sm text-brand-400 inline-flex items-center gap-1" onClick={() => setForm((f) => ({ ...f, healthProfile: { ...f.healthProfile, insuranceDetails: { ...f.healthProfile.insuranceDetails, policies: [...f.healthProfile.insuranceDetails.policies, emptyInsurancePolicy()] } } }))}>
                <Plus className="w-4 h-4" /> Add policy
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="app-page">
      <div className="page-shell-narrow max-w-4xl animate-fade-in">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isGuardian && activeTab === 'self' ? 'Your profile' : 'Healthcare profile'}
          </h1>
          {profilePanel === 'health' && completion.percent < 100 && (
            <span className="text-sm font-medium text-rose-400 tabular-nums">
              {completion.pending} section{completion.pending === 1 ? '' : 's'} to complete
            </span>
          )}
        </div>

        {isGuardian ? (
          <div className="flex flex-wrap gap-2 mb-5">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-400 bg-brand-500/15 text-brand-300'
                    : 'border-glass-border/60 text-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {profilePanel === 'guardian-account' ? (
          <div className="space-y-5">
            <GuardianAccountPanel user={user} setUser={setUser} />
            <ChangePasswordForm />
          </div>
        ) : null}

        {profilePanel === 'health' && loadingProfile ? (
          <p className="text-sm text-muted py-8 text-center">Loading profile…</p>
        ) : null}

        {profilePanel === 'health' && !loadingProfile ? (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-glass-border/50 bg-glass/20 p-4">
              <ProfileCompletionPie completion={completion} size={88} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {completion.percent >= 100 ? 'Profile complete' : 'Profile progress'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {completion.filled} of {completion.total} sections complete
                </p>
                {completion.percent < 100 && completion.pending > 0 ? (
                  <p className="text-xs font-semibold text-rose-400 mt-1">
                    {completion.pending} section{completion.pending === 1 ? '' : 's'} pending
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mb-5">
              <ProfileCompletionTimeline completion={completion} onStepClick={scrollToStep} />
            </div>

            {guardianModalOpen && linkedGuardian && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
                <div className="glass-panel max-w-md w-full p-5 sm:p-6 relative">
                  <button type="button" className="absolute top-3 right-3 p-1 text-muted hover:text-foreground" onClick={() => setGuardianModalOpen(false)} aria-label="Close">
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-foreground pr-8">Your guardian already exists</h2>
                  <p className="text-sm text-muted mt-2">This patient account is linked to a guardian. Their details are read-only.</p>
                  <dl className="mt-4 space-y-2 text-sm rounded-xl border border-glass-border/50 bg-glass/30 p-3">
                    <div className="flex justify-between gap-2"><dt className="text-muted">Name</dt><dd className="font-medium">{linkedGuardian.name}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">Email</dt><dd className="font-medium break-all">{linkedGuardian.email}</dd></div>
                  </dl>
                  <button type="button" className="btn-primary w-full mt-5" onClick={() => setGuardianModalOpen(false)}>OK</button>
                </div>
              </div>
            )}

            <form onSubmit={save} className="space-y-4">
              <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="space-y-3">
                {accordionItems.map((item) => {
                  const step = stepById[item.value];
                  return (
                    <AccordionItem key={item.value} value={item.value} id={`section-${item.value}`}>
                      <div ref={(el) => { sectionRefs.current[item.value] = el; }}>
                        <AccordionTrigger>
                          <span className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-1">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            {step ? stepStatusBadge({ status: step.filled ? 'complete' : 'pending' }) : null}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>{item.content}</AccordionContent>
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-glass-border/40">
                <Link to="/dashboard" className="btn-outline px-5 py-2.5 text-sm">Cancel</Link>
                <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-semibold" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>

            {!isGuardian ? (
              <div className="mt-6">
                <ChangePasswordForm />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default UserProfile;
