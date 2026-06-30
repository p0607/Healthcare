import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bell,
  KeyRound,
  Save,
  Shield,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import NurseCaregiverNav from '../components/NurseCaregiverNav.jsx';

const emptyCert = () => ({ title: '', issuer: '', year: '' });

function parseCerts(user) {
  const raw = user?.certifications;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((c) =>
    typeof c === 'string'
      ? { title: c, issuer: '', year: '' }
      : {
          title: c?.title || '',
          issuer: c?.issuer || '',
          year: c?.year || '',
        }
  );
}

const initials = (name) => {
  const t = (name || '').trim();
  if (!t) return 'NC';
  return t
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
};

const NurseSettings = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profilePhotoUrl || '');
  const [about, setAbout] = useState(user?.about || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [certifications, setCertifications] = useState(() => parseCerts(user));
  const [certDraft, setCertDraft] = useState(emptyCert);
  const [notifyNewJobs, setNotifyNewJobs] = useState(user?.notifyNewJobs !== false);
  const [notifySms, setNotifySms] = useState(Boolean(user?.notifySms));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');

  useEffect(() => {
    if (!user) return;
    setProfilePhotoUrl(user.profilePhotoUrl || '');
    setAbout(user.about || '');
    setPhone(user.phone || '');
    setCertifications(parseCerts(user));
    setNotifyNewJobs(user.notifyNewJobs !== false);
    setNotifySms(Boolean(user.notifySms));
  }, [user]);

  const persistUser = (updated) => {
    setUser(updated);
    localStorage.setItem('nc_user', JSON.stringify(updated));
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 450_000) {
      toast.error('Image must be under 450 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePhotoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const addCertification = () => {
    const title = certDraft.title.trim();
    if (!title) {
      toast.error('Enter a certification title');
      return;
    }
    setCertifications((list) => [
      ...list,
      { title, issuer: certDraft.issuer.trim(), year: certDraft.year.trim() },
    ]);
    setCertDraft(emptyCert());
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/nurses/me/settings', {
        profilePhotoUrl: profilePhotoUrl || null,
        about,
        certifications,
        notifyNewJobs,
        notifySms,
      });
      if (phone !== (user?.phone || '')) {
        const { data: prof } = await api.put('/nurses/me', { phone });
        persistUser({ ...data.user, phone: prof.user.phone });
      } else {
        persistUser(data.user);
      }
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPwdSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally {
      setPwdSaving(false);
    }
  };

  const deactivateAccount = async () => {
    if (!deactivatePassword) {
      toast.error('Enter your password to confirm');
      return;
    }
    if (!window.confirm('Deactivate your account? You will be signed out and hidden from patients until support reactivates you.')) {
      return;
    }
    setDeactivating(true);
    try {
      await api.post('/auth/deactivate-account', { password: deactivatePassword });
      toast.success('Account deactivated');
      logout();
      navigate('/login?staff=1&role=nurse');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not deactivate account');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="app-page page-shell-wide">
      <div className="dashboard-layout">
        <NurseCaregiverNav activeId="settings" />

        <div className="dashboard-main space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-muted mt-1">Manage your account, security, and preferences.</p>
          </div>

          <section className="card space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Profile photo
            </h2>
            <div className="flex items-center gap-4">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-2xl object-cover border border-glass-border/60"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/30 grid place-items-center text-xl font-bold">
                  {initials(user?.name)}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="btn-outline cursor-pointer text-sm">
                  <Upload className="w-4 h-4" />
                  Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                </label>
                {profilePhotoUrl && (
                  <button
                    type="button"
                    className="btn-outline text-sm text-rose-700 border-rose-200"
                    onClick={() => setProfilePhotoUrl('')}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">About</label>
              <textarea
                rows={3}
                className="input mt-1.5 resize-none"
                placeholder="Short bio for your profile…"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Phone</label>
              <input
                className="input mt-1.5 max-w-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contact number"
              />
            </div>
            <p className="text-xs text-muted">
              Email: <span className="font-medium text-foreground/90">{user?.email}</span> (cannot be changed here)
            </p>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              Certifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className="input"
                placeholder="Title (e.g. BLS, MBBS)"
                value={certDraft.title}
                onChange={(e) => setCertDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Issuer"
                value={certDraft.issuer}
                onChange={(e) => setCertDraft((d) => ({ ...d, issuer: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Year"
                value={certDraft.year}
                onChange={(e) => setCertDraft((d) => ({ ...d, year: e.target.value }))}
              />
            </div>
            <button type="button" className="btn-outline text-sm" onClick={addCertification}>
              Add certification
            </button>
            <ul className="space-y-2">
              {certifications.map((c, i) => (
                <li
                  key={`${c.title}-${i}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-glass-border/60 bg-glass/30/80 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{c.title}</div>
                    {(c.issuer || c.year) && (
                      <div className="text-xs text-muted mt-0.5">
                        {[c.issuer, c.year].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-muted/70 hover:text-rose-600 shrink-0"
                    onClick={() => setCertifications((list) => list.filter((_, j) => j !== i))}
                    aria-label="Remove certification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {certifications.length === 0 && (
                <p className="text-xs text-muted">No certifications added yet.</p>
              )}
            </ul>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              Notifications
            </h2>
            <label className="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
              <span className="text-sm text-foreground/90">New job alerts (in-app)</span>
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={notifyNewJobs}
                onChange={(e) => setNotifyNewJobs(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-foreground/90">SMS for urgent bookings</span>
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={notifySms}
                onChange={(e) => setNotifySms(e.target.checked)}
              />
            </label>
          </section>

          <section className="card space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-600" />
              Change password
            </h2>
            <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              <input
                type="password"
                className="input"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <input
                type="password"
                className="input"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <input
                type="password"
                className="input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <div className="sm:col-span-3">
                <button type="submit" className="btn-primary text-sm" disabled={pwdSaving}>
                  {pwdSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </section>

          <section className="card border-rose-200/80 bg-rose-50/30 space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-4 h-4" />
              Deactivate account
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Your profile will be hidden from patients and you will not receive new bookings. Contact Alchemy
              support to restore access. Active jobs should be completed first.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end max-w-xl">
              <input
                type="password"
                className="input flex-1"
                placeholder="Confirm with your password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-outline border-rose-300 text-rose-800 hover:bg-rose-100 text-sm shrink-0"
                disabled={deactivating}
                onClick={deactivateAccount}
              >
                {deactivating ? 'Deactivating…' : 'Deactivate account'}
              </button>
            </div>
          </section>

          <div className="flex justify-end pb-6">
            <button type="button" className="btn-primary px-6" onClick={saveSettings} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save all settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseSettings;
