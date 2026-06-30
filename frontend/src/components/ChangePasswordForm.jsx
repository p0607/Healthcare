import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-glass-border/50 bg-glass/20 p-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Reset password</h2>
        <p className="text-xs text-muted mt-1">
          Required after signing in with a temporary guardian password.
        </p>
      </div>
      <label className="block text-sm font-medium">
        Current password
        <input type="password" className="input mt-1" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        New password
        <input type="password" className="input mt-1" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Confirm new password
        <input type="password" className="input mt-1" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </label>
      <button type="submit" className="btn-primary px-5 py-2.5 text-sm" disabled={saving}>
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
