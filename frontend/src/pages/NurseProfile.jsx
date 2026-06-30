import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import NurseCaregiverNav from '../components/NurseCaregiverNav.jsx';
import NurseServiceOfferingsForm from '../components/NurseServiceOfferingsForm.jsx';
import {
  filterOfferingsForService,
  resolveCaregiverServiceType,
} from '../lib/caregiverServices';
import { startCaregiverLocationWatch } from '../lib/caregiverLocationTracking';

const NurseProfile = () => {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.location?.address || '',
    qualification: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
  });
  const caregiverServiceType = useMemo(
    () =>
      resolveCaregiverServiceType(
        user?.careOfferings,
        form.qualification || user?.specialization,
        user?.caregiverCategory
      ),
    [user?.careOfferings, form.qualification, user?.specialization, user?.caregiverCategory]
  );

  const [visitRate, setVisitRate] = useState(String(user?.visitRate ?? 599));
  const [careOfferings, setCareOfferings] = useState(() =>
    filterOfferingsForService(user?.careOfferings, caregiverServiceType)
  );

  useEffect(() => {
    if (!user?._id) return;
    const type = resolveCaregiverServiceType(
      user.careOfferings,
      form.qualification || user.specialization,
      user.caregiverCategory
    );
    setCareOfferings(filterOfferingsForService(user.careOfferings, type));
    setVisitRate(String(user.visitRate ?? 599));
  }, [user?._id, user?.careOfferings, user?.visitRate, user?.specialization, form.qualification]);

  useEffect(() => {
    if (user?.location?.address) {
      setForm((f) => ({ ...f, address: user.location.address }));
    }
  }, [user?.location?.address]);

  useEffect(() => {
    return startCaregiverLocationWatch({
      enabled: user?.available !== false,
      getSavedCoordinates: () => user?.location?.coordinates,
      onPersisted: (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('nc_user', JSON.stringify(updatedUser));
        if (updatedUser.location?.address) {
          setForm((f) => ({ ...f, address: updatedUser.location.address }));
        }
      },
    });
  }, [user?.available, setUser]);

  const saveProfile = async () => {
    if (careOfferings.length === 0) {
      toast.error('Select at least one sub-service with a rate');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/nurses/me', {
        name: form.name,
        phone: form.phone,
        specialization: form.qualification,
        licenseNumber: form.licenseNumber,
        location: {
          address: form.address,
          ...(user?.location?.coordinates?.length === 2
            ? { coordinates: user.location.coordinates }
            : {}),
        },
        visitRate: Math.max(0, Math.round(Number(visitRate)) || 0),
        careOfferings,
      });
      if (!data.user?.careOfferings?.length) {
        toast.error('Sub-services were not saved. Try again after restarting the API server.');
        return;
      }
      setUser(data.user);
      localStorage.setItem('nc_user', JSON.stringify(data.user));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page page-shell-wide">
      <div className="dashboard-layout">
        <NurseCaregiverNav activeId="profile" />

        <div className="dashboard-main space-y-6">
          <p className="text-sm text-muted">
            For profile photo, password, certifications, and account controls, open{' '}
            <Link to="/nurse/settings" className="text-brand-400 font-semibold hover:text-brand-300 hover:underline">
              Settings
            </Link>
            .
          </p>
          <div className="glass-panel p-5 sm:p-7">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 min-w-0">
              <input
                className="input min-w-0"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="input min-w-0"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className="input min-w-0"
                placeholder="Address (updates from GPS when available)"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                title="Saved to your profile; auto-updates from device location when you are available"
              />
              <input
                className="input min-w-0"
                placeholder="Qualification"
                value={form.qualification}
                onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
              />
              <input
                className="input min-w-0"
                placeholder="License number"
                value={form.licenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
              />
            </div>

            <div className="mt-6">
              <NurseServiceOfferingsForm
                showBaseFee={false}
                serviceType={caregiverServiceType}
                visitRate={visitRate}
                careOfferings={careOfferings}
                onCareOfferingsChange={setCareOfferings}
                disabled={saving}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-primary px-5 py-2" onClick={saveProfile} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseProfile;
