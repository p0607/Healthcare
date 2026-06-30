import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api';
import { REGISTER_ACCOUNT_KINDS, navigateForUser } from '../lib/accountKinds';
import { labelForRegisterServiceType } from '../lib/useAvailableCareTypes';
import ServiceRegistrationPicker from '../components/register/ServiceRegistrationPicker.jsx';
import GuestOnly from '../components/GuestOnly.jsx';

const SPECIALIZATION_PLACEHOLDER = {
  nurse_visit: 'e.g. General nursing, ICU, pediatrics',
  doctor_consult: 'e.g. Cardiology, general physician',
  physiotherapy: 'e.g. Sports rehab, geriatric mobility',
  emergency: 'e.g. Paramedic, ambulance response',
};

const fieldLabel = 'block text-xs font-medium text-muted mb-1';
const fieldInput = 'input !py-2 !text-sm';

const Register = () => {
  const [accountKinds, setAccountKinds] = useState(['patient']);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    licenseNumber: '',
  });
  const [patientDetails, setPatientDetails] = useState({ name: '', email: '', phone: '' });
  const [patientCheck, setPatientCheck] = useState(null);
  const [checkingPatient, setCheckingPatient] = useState(false);

  const [caregiverCategory, setCaregiverCategory] = useState('nurse_visit');
  const [careOfferings, setCareOfferings] = useState([]);

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const wantsPatient = accountKinds.includes('patient');
  const wantsGuardian = accountKinds.includes('guardian');
  const wantsService = accountKinds.includes('service_provider');

  const columnCount = 1 + (wantsGuardian ? 1 : 0) + (wantsService ? 1 : 0);
  const gridColsClass =
    columnCount >= 3
      ? 'lg:grid-cols-3'
      : columnCount === 2
        ? 'lg:grid-cols-2'
        : 'lg:grid-cols-1 lg:max-w-2xl lg:mx-auto';

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPatient = (k) => (e) => {
    setPatientDetails((p) => ({ ...p, [k]: e.target.value }));
    setPatientCheck(null);
  };

  const toggleKind = (id) => {
    setAccountKinds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((k) => k !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  };

  const checkPatientEmail = useCallback(async (email) => {
    const trimmed = email?.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setPatientCheck(null);
      return;
    }
    setCheckingPatient(true);
    try {
      const { data } = await api.post('/auth/check-patient', { email: trimmed });
      setPatientCheck(data);
    } catch (err) {
      setPatientCheck({ error: err?.response?.data?.message || 'Could not verify patient email' });
    } finally {
      setCheckingPatient(false);
    }
  }, []);

  useEffect(() => {
    if (!wantsGuardian) return undefined;
    const t = setTimeout(() => checkPatientEmail(patientDetails.email), 500);
    return () => clearTimeout(t);
  }, [wantsGuardian, patientDetails.email, checkPatientEmail]);

  const patientStatus = useMemo(() => {
    if (!wantsGuardian || !patientDetails.email.trim()) return null;
    if (checkingPatient) return { tone: 'muted', text: 'Checking patient email…' };
    if (patientCheck?.error) return { tone: 'error', text: patientCheck.error };
    if (patientCheck?.exists) {
      return {
        tone: 'ok',
        text: patientCheck.message || 'Patient account found — will be linked to your guardian profile',
      };
    }
    if (patientCheck && !patientCheck.exists) {
      return { tone: 'info', text: 'New patient will use your password below' };
    }
    return null;
  }, [wantsGuardian, patientDetails.email, checkingPatient, patientCheck]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (accountKinds.length === 0) {
      toast.error('Select at least one role to register as');
      return;
    }
    if (wantsGuardian && (!patientDetails.name.trim() || !patientDetails.email.trim())) {
      toast.error('Enter the patient’s full name and email');
      return;
    }
    if (wantsService) {
      if (!caregiverCategory) {
        toast.error('Choose a service type (Nurse, Doctor, Physio, or Ambulance)');
        return;
      }
      if (careOfferings.length === 0) {
        toast.error('Select at least one sub-service with your rate');
        return;
      }
    }
    if (patientCheck?.error) {
      toast.error(patientCheck.error);
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        accountKinds,
      };
      if (wantsGuardian) {
        payload.patientDetails = {
          name: patientDetails.name.trim(),
          email: patientDetails.email.trim(),
          phone: patientDetails.phone?.trim() || undefined,
        };
      }
      if (wantsService) {
        payload.caregiverCategory = caregiverCategory;
        payload.careOfferings = careOfferings;
        payload.specialization =
          form.specialization.trim() || labelForRegisterServiceType(caregiverCategory);
        payload.licenseNumber = form.licenseNumber?.trim() || undefined;
      }

      const u = await register(payload);
      toast.success(`Welcome, ${u.name.split(' ')[0]}!`);
      navigateForUser(u, navigate);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <GuestOnly>
    <div className="register-page h-full min-h-0 flex flex-col bg-canvas">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 py-3 border-b border-glass-border/50 nav-glass">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="text-xs text-muted mt-0.5 hidden sm:block">
            Select roles and fill each column — no scrolling needed on desktop
          </p>
        </div>
        <Link
          to="/login"
          className="text-sm text-brand-400 font-medium hover:text-brand-300 hover:underline shrink-0"
        >
          Sign in
        </Link>
      </header>

      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className={`register-page__columns flex-1 min-h-0 grid grid-cols-1 ${gridColsClass} divide-y lg:divide-y-0 lg:divide-x divide-glass-border/50`}
        >
          {/* Column 1 — roles + your details */}
          <section className="register-page__col min-h-0 flex flex-col p-4 sm:p-5 lg:p-6">
            <h2 className="text-sm font-semibold text-foreground shrink-0 mb-3">Account type & your details</h2>

            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {REGISTER_ACCOUNT_KINDS.map((k) => {
                const checked = accountKinds.includes(k.id);
                return (
                  <label
                    key={k.id}
                    className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 cursor-pointer transition text-left ${
                      checked
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-glass-border/50 hover:bg-glass/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-glass-border shrink-0"
                      checked={checked}
                      onChange={() => toggleKind(k.id)}
                      disabled={loading}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{k.label}</span>
                      <span className="block text-[10px] leading-tight text-muted line-clamp-2">{k.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5 content-start auto-rows-min">
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Full name</label>
                <input className={fieldInput} required value={form.name} onChange={set('name')} disabled={loading} />
              </div>
              <div>
                <label className={fieldLabel}>Email</label>
                <input
                  type="email"
                  className={fieldInput}
                  required
                  value={form.email}
                  onChange={set('email')}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={fieldLabel}>Phone</label>
                <input className={fieldInput} value={form.phone} onChange={set('phone')} disabled={loading} />
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Password</label>
                <input
                  type="password"
                  className={fieldInput}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={set('password')}
                  disabled={loading}
                />
                {wantsGuardian && (
                  <p className="text-[10px] text-muted mt-0.5">Shared with new patient if we create one</p>
                )}
              </div>
              {wantsService && !wantsGuardian && (
                <>
                  <div>
                    <label className={fieldLabel}>Specialization</label>
                    <input
                      className={fieldInput}
                      placeholder={SPECIALIZATION_PLACEHOLDER[caregiverCategory]}
                      value={form.specialization}
                      onChange={set('specialization')}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>License number</label>
                    <input
                      className={fieldInput}
                      placeholder="RN-XXXX"
                      value={form.licenseNumber}
                      onChange={set('licenseNumber')}
                      disabled={loading}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Column 2 — guardian */}
          {wantsGuardian && (
            <section className="register-page__col min-h-0 flex flex-col p-4 sm:p-5 lg:p-6 bg-glass/15">
              <h2 className="text-sm font-semibold text-foreground shrink-0 mb-3">Patient you care for</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 content-start auto-rows-min">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={fieldLabel}>Patient full name</label>
                  <input
                    className={fieldInput}
                    required={wantsGuardian}
                    value={patientDetails.name}
                    onChange={setPatient('name')}
                    disabled={loading}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={fieldLabel}>Patient email</label>
                  <input
                    type="email"
                    className={fieldInput}
                    required={wantsGuardian}
                    value={patientDetails.email}
                    onChange={setPatient('email')}
                    disabled={loading}
                  />
                  {patientStatus && (
                    <p
                      className={`text-[10px] mt-0.5 leading-snug ${
                        patientStatus.tone === 'error'
                          ? 'text-rose-400'
                          : patientStatus.tone === 'ok'
                            ? 'text-emerald-400'
                            : 'text-muted'
                      }`}
                    >
                      {patientStatus.text}
                    </p>
                  )}
                </div>
                <div>
                  <label className={fieldLabel}>Patient phone</label>
                  <input
                    className={fieldInput}
                    value={patientDetails.phone}
                    onChange={setPatient('phone')}
                    disabled={loading}
                  />
                </div>
                {wantsService && (
                  <>
                    <div>
                      <label className={fieldLabel}>Your specialization</label>
                      <input
                        className={fieldInput}
                        placeholder={SPECIALIZATION_PLACEHOLDER[caregiverCategory]}
                        value={form.specialization}
                        onChange={set('specialization')}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className={fieldLabel}>License number</label>
                      <input
                        className={fieldInput}
                        placeholder="RN-XXXX"
                        value={form.licenseNumber}
                        onChange={set('licenseNumber')}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Column 3 — service */}
          {wantsService && (
            <section className="register-page__col min-h-0 flex flex-col p-4 sm:p-5 lg:p-6 bg-glass/20">
              <ServiceRegistrationPicker
                layout="columns"
                caregiverCategory={caregiverCategory}
                onCaregiverCategoryChange={setCaregiverCategory}
                careOfferings={careOfferings}
                onCareOfferingsChange={setCareOfferings}
                showLicenseFields={!wantsGuardian}
                specialization={form.specialization}
                onSpecializationChange={set('specialization')}
                licenseNumber={form.licenseNumber}
                onLicenseNumberChange={set('licenseNumber')}
                specializationPlaceholder={SPECIALIZATION_PLACEHOLDER[caregiverCategory]}
                disabled={loading}
              />
            </section>
          )}
        </div>

        <footer className="shrink-0 border-t border-glass-border/50 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-glass/30">
          <button type="submit" className="btn-primary sm:min-w-[12rem] !py-2.5" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-xs text-muted sm:flex-1">
            {wantsPatient && !wantsService
              ? 'Complete health details later on Profile.'
              : 'Multiple roles? Switch between them from the menu after sign-in.'}
          </p>
        </footer>
      </form>
    </div>
    </GuestOnly>
  );
};

export default Register;
