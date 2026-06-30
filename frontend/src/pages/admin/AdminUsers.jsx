import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import {
  CAREGIVER_SERVICE_TYPES,
  caregiverServiceLabel,
  resolveCaregiverServiceType,
} from '../../lib/caregiverServices';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const roleLabel = (role) => {
  if (role === 'user') return 'Patient';
  if (role === 'nurse') return 'Caregiver';
  if (role === 'admin') return 'Admin';
  return role || '—';
};

const TH =
  'px-3 py-2.5 text-left text-xs font-semibold text-muted bg-glass-elevated/60 border-b border-glass-border/60 whitespace-nowrap';
const TD = 'px-3 py-2.5 border-b border-glass-border/60 align-middle text-foreground/85';
const cellInput = 'input !py-1.5 !px-2 !text-xs !rounded-lg min-w-0';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    const { data } = await api.get('/nurses/admin/users');
    setUsers(data.users);
  };

  useEffect(() => {
    load();
  }, []);

  const userId = (u) => u._id || u.id;

  const startEdit = (u) => {
    setEditingId(userId(u));
    setEditDraft({
      role: u.role || 'user',
      caregiverCategory:
        u.caregiverCategory || resolveCaregiverServiceType(u.careOfferings, u.specialization) || 'nurse_visit',
      specialization: u.specialization || '',
      phone: u.phone || '',
      available: u.available !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (id) => {
    setSavingEdit(true);
    try {
      const payload = {
        role: editDraft.role,
        phone: editDraft.phone,
      };
      if (editDraft.role === 'nurse') {
        payload.caregiverCategory = editDraft.caregiverCategory;
        payload.specialization = editDraft.specialization;
        payload.available = editDraft.available;
      }
      const { data } = await api.patch(`/nurses/admin/users/${id}`, payload);
      setUsers((list) => list.map((u) => (userId(u) === id ? data.user : u)));
      toast.success('User updated');
      cancelEdit();
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 404 && msg?.includes('Route not found')) {
        toast.error('Server needs a restart — stop and run npm start in the backend folder, then try again.');
      } else {
        toast.error(msg || 'Could not save');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-base text-foreground">Users</h2>
      <p className="text-xs text-muted mt-0.5 mb-3">
        Edit login role (Patient or Caregiver), category, phone, and availability. Caregivers log in with role{' '}
        <b>nurse</b>.
      </p>
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Email</th>
                <th className={TH}>Login role</th>
                <th className={TH}>Category</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Specialization</th>
                <th className={`${TH} min-w-[11rem]`}>Sub-services</th>
                <th className={TH}>Joined</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted border-b border-glass-border/60">
                    No users yet.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const offerings = u.careOfferings || [];
                const serviceType = resolveCaregiverServiceType(
                  offerings,
                  u.specialization,
                  u.caregiverCategory
                );
                const id = userId(u);
                const isEditing = editingId === id;
                const draftRole = isEditing ? editDraft.role : u.role;
                const isCaregiver = draftRole === 'nurse';
                const rowCls = isEditing
                  ? 'bg-brand-500/15 ring-1 ring-inset ring-brand-400/35'
                  : 'hover:bg-glass-elevated/50';

                return (
                  <tr key={id} className={rowCls}>
                    <td className={`${TD} font-medium whitespace-nowrap`}>{u.name}</td>
                    <td className={`${TD} text-muted max-w-[10rem] truncate`} title={u.email}>
                      {u.email}
                    </td>
                    <td className={TD}>
                      {isEditing && u.role !== 'admin' ? (
                        <select
                          className={`${cellInput} w-[7.5rem]`}
                          value={editDraft.role || 'user'}
                          onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}
                          aria-label="Login role"
                        >
                          <option value="user">Patient</option>
                          <option value="nurse">Caregiver</option>
                        </select>
                      ) : (
                        <span
                          className={`badge ${
                            u.role === 'nurse'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                              : u.role === 'admin'
                                ? 'bg-violet-50 text-violet-800 border border-violet-100'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {roleLabel(u.role)}
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      {isCaregiver ? (
                        isEditing ? (
                          <select
                            className={`${cellInput} w-[9.5rem]`}
                            value={editDraft.caregiverCategory || 'nurse_visit'}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, caregiverCategory: e.target.value }))
                            }
                          >
                            {CAREGIVER_SERVICE_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="badge bg-brand-50 text-brand-800 border border-brand-100">
                            {caregiverServiceLabel(serviceType)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted/70">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      {isEditing ? (
                        <input
                          className={`${cellInput} w-28`}
                          value={editDraft.phone}
                          onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                          placeholder="Phone"
                        />
                      ) : (
                        <span className="text-muted">{u.phone || '—'}</span>
                      )}
                    </td>
                    <td className={`${TD} max-w-[9rem]`}>
                      {isEditing && isCaregiver ? (
                        <input
                          className={`${cellInput} w-full max-w-[9rem]`}
                          value={editDraft.specialization}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, specialization: e.target.value }))
                          }
                          placeholder="Specialization"
                        />
                      ) : (
                        <span className="text-muted">{u.specialization || '—'}</span>
                      )}
                    </td>
                    <td className={TD}>
                      {isCaregiver || u.role === 'nurse' ? (
                        offerings.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto pr-1">
                            {offerings.map((o) => (
                              <span
                                key={o.careServiceOptionId}
                                className="inline-block rounded-md bg-brand-50 border border-brand-100 px-1.5 py-0.5 text-[10px] text-brand-900 leading-tight"
                                title={fmtInr(o.rate)}
                              >
                                {o.label || 'Sub-service'} · {fmtInr(o.rate)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted/70 text-xs">None saved</span>
                        )
                      ) : (
                        <span className="text-muted/70">—</span>
                      )}
                    </td>
                    <td className={`${TD} text-muted whitespace-nowrap tabular-nums`}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap`}>
                      {u.role !== 'admin' ? (
                        isEditing ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {isCaregiver && (
                              <label className="inline-flex items-center gap-1.5 text-xs text-muted mr-1">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300"
                                  checked={editDraft.available !== false}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, available: e.target.checked }))
                                  }
                                />
                                Available
                              </label>
                            )}
                            <button
                              type="button"
                              className="btn-primary !py-1 !px-2.5 text-xs !rounded-lg"
                              disabled={savingEdit}
                              onClick={() => saveEdit(id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-outline !py-1 !px-2.5 text-xs !rounded-lg"
                              disabled={savingEdit}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-brand-700 dark:text-brand-300 text-xs font-semibold hover:text-brand-800 dark:hover:text-brand-200 hover:underline px-1"
                            onClick={() => startEdit(u)}
                          >
                            Edit
                          </button>
                        )
                      ) : (
                        <span className="text-muted/70 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
