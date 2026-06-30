import { useEffect, useState } from 'react';
import { api } from './api';
import { caregiverServiceLabel } from './caregiverServices';

/** Labels shown on the register page (matches backend REGISTER_TYPE_LABELS). */
export const REGISTER_SERVICE_LABELS = {
  nurse_visit: 'Nurse',
  doctor_consult: 'Doctor',
  physiotherapy: 'Physio',
  emergency: 'Ambulance',
};

export function labelForRegisterServiceType(serviceType) {
  return REGISTER_SERVICE_LABELS[serviceType] || caregiverServiceLabel(serviceType);
}

/**
 * Loads service types that have at least one active admin sub-service.
 * Updates automatically when admin adds catalog options.
 */
export function useAvailableCareTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/care-services/available-types');
        if (!cancelled) {
          setTypes(
            (data.types || []).map((t) => ({
              ...t,
              label: t.label || labelForRegisterServiceType(t.serviceType),
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setTypes([]);
          setError(err?.response?.data?.message || 'Could not load services');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { types, loading, error };
}
