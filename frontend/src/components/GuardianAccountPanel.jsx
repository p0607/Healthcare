import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { guardianAlsoPatient } from '../lib/patientProfile';
import { api } from '../lib/api';

export default function GuardianAccountPanel({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [alsoPatient, setAlsoPatient] = useState(guardianAlsoPatient(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAlsoPatient(guardianAlsoPatient(user));
  }, [user]);

  const saveAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me/guardian-account', {
        name: name.trim(),
        phone: phone.trim(),
        alsoPatient,
      });
      setUser(data.user);
      localStorage.setItem('nc_user', JSON.stringify(data.user));
      toast.success(data.message || 'Account updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={saveAccount} className="space-y-4 rounded-xl border border-glass-border/50 bg-glass/20 p-4">
        <h2 className="text-lg font-bold text-foreground">Guardian account</h2>
        <label className="block text-sm font-medium">
          Full name
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Phone
          <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input className="input mt-1 opacity-70" value={user?.email || ''} readOnly disabled />
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={alsoPatient} onChange={(e) => setAlsoPatient(e.target.checked)} />
          <span>
            <span className="font-semibold text-foreground">I am also a patient</span>
            <span className="block text-xs text-muted mt-0.5">
              Manage your own health profile in a separate tab alongside linked patients.
            </span>
          </span>
        </label>
        <button type="submit" className="btn-primary px-5 py-2.5 text-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save account'}
        </button>
      </form>
    </div>
  );
}
