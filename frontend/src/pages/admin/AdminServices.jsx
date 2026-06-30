import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminServiceImageField from '../../components/admin/AdminServiceImageField.jsx';
import { api } from '../../lib/api';
import { imageFileToDataUrl } from '../../lib/marketingImage';
import { SERVICE_SECTIONS } from '../../lib/serviceSections';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const newSubService = () => ({
  name: '',
  rate: '499',
  description: '',
  imageUrl: '',
});

const newForm = () => ({
  serviceName: '',
  subServices: [newSubService()],
});

const AdminServices = () => {
  const [sections, setSections] = useState([]);
  const [hiddenDefaultSections, setHiddenDefaultSections] = useState([]);
  const [hiddenDefaultServices, setHiddenDefaultServices] = useState({});
  const [defaultServiceImages, setDefaultServiceImages] = useState({});
  const [form, setForm] = useState(newForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get('/marketing-services/admin/all');
    setSections(data.sections || []);
    setHiddenDefaultSections(data.hiddenDefaultSections || []);
    setHiddenDefaultServices(data.hiddenDefaultServices || {});
    setDefaultServiceImages(data.defaultServiceImages || {});
  };

  const defaultServiceImage = (sectionId, serviceId) =>
    defaultServiceImages[sectionId]?.[serviceId] || null;

  const uploadDefaultServiceImage = async (section, service, file) => {
    try {
      const imageUrl = await imageFileToDataUrl(file);
      await api.patch(`/marketing-services/admin/default/${section.id}/services/${service.id}`, {
        imageUrl,
      });
      toast.success('Image saved');
      load();
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Could not upload image');
    }
  };

  const removeDefaultServiceImage = async (section, service) => {
    try {
      await api.patch(`/marketing-services/admin/default/${section.id}/services/${service.id}`, {
        imageUrl: null,
      });
      toast.success('Image removed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove image');
    }
  };

  const uploadAdminServiceImage = async (section, service, file) => {
    try {
      const imageUrl = await imageFileToDataUrl(file);
      await api.patch(`/marketing-services/admin/${section.id}/services/${service.id}`, { imageUrl });
      toast.success('Image saved');
      load();
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Could not upload image');
    }
  };

  const removeAdminServiceImage = async (section, service) => {
    try {
      await api.patch(`/marketing-services/admin/${section.id}/services/${service.id}`, { imageUrl: null });
      toast.success('Image removed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove image');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/marketing-services/admin', {
        serviceName: form.serviceName,
        subServices: form.subServices,
      });
      toast.success('Service added');
      setForm(newForm());
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not add service');
    } finally {
      setSaving(false);
    }
  };

  const updateSubService = (index, patch) => {
    setForm((current) => ({
      ...current,
      subServices: current.subServices.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    }));
  };

  const addSubService = () => {
    setForm((current) => ({ ...current, subServices: [...current.subServices, newSubService()] }));
  };

  const removeDraftSubService = (index) => {
    setForm((current) => ({
      ...current,
      subServices:
        current.subServices.length === 1
          ? current.subServices
          : current.subServices.filter((_, idx) => idx !== index),
    }));
  };

  const defaultSectionHidden = (section) => hiddenDefaultSections.includes(section.id);
  const defaultSubServiceHidden = (section, service) =>
    (hiddenDefaultServices[section.id] || []).includes(service.id);

  const toggleDefaultSection = async (section) => {
    try {
      await api.patch(`/marketing-services/admin/default/${section.id}`, {
        active: defaultSectionHidden(section),
      });
      toast.success(defaultSectionHidden(section) ? 'Default service shown' : 'Default service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update default service');
    }
  };

  const removeDefaultSection = async (section) => {
    if (!window.confirm(`Hide ${section.title} from homepage and dashboard services?`)) return;
    try {
      await api.delete(`/marketing-services/admin/default/${section.id}`);
      toast.success('Default service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not hide default service');
    }
  };

  const toggleDefaultSubService = async (section, service) => {
    try {
      await api.patch(`/marketing-services/admin/default/${section.id}/services/${service.id}`, {
        active: defaultSubServiceHidden(section, service),
      });
      toast.success(defaultSubServiceHidden(section, service) ? 'Default sub-service shown' : 'Default sub-service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update default sub-service');
    }
  };

  const removeDefaultSubService = async (section, service) => {
    if (!window.confirm(`Hide ${service.laymanName} from homepage and dashboard services?`)) return;
    try {
      await api.delete(`/marketing-services/admin/default/${section.id}/services/${service.id}`);
      toast.success('Default sub-service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not hide default sub-service');
    }
  };

  const toggleSection = async (section) => {
    try {
      await api.patch(`/marketing-services/admin/${section.id}`, { active: section.active === false });
      toast.success(section.active === false ? 'Service shown' : 'Service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update service');
    }
  };

  const removeSection = async (section) => {
    if (!window.confirm(`Remove ${section.title}? This also removes its sub-services from booking options.`)) return;
    try {
      await api.delete(`/marketing-services/admin/${section.id}`);
      toast.success('Service removed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove service');
    }
  };

  const toggleSubService = async (section, service) => {
    try {
      await api.patch(`/marketing-services/admin/${section.id}/services/${service.id}`, {
        active: service.active === false,
      });
      toast.success(service.active === false ? 'Sub-service shown' : 'Sub-service hidden');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update sub-service');
    }
  };

  const removeSubService = async (section, service) => {
    if (!window.confirm(`Remove ${service.laymanName}?`)) return;
    try {
      await api.delete(`/marketing-services/admin/${section.id}/services/${service.id}`);
      toast.success('Sub-service removed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove sub-service');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base text-foreground">Add service</h2>
        <p className="text-xs text-muted mt-0.5">
          Add a homepage service section with a sub-service, price, description, and optional picture. The same image appears on the patient services list.
        </p>
      </div>

      <div className="card">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Service name</label>
            <input
              className="input"
              value={form.serviceName}
              onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
              placeholder="e.g. Elder Care, Smart Care, Home Recovery"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Sub-services</h3>
              <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={addSubService}>
                + Add sub-service
              </button>
            </div>

            {form.subServices.map((subService, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border border-glass-border/60 bg-glass/25 p-3"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_8rem_1.4fr_auto] md:items-end">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Sub-service</label>
                  <input
                    className="input"
                    value={subService.name}
                    onChange={(e) => updateSubService(index, { name: e.target.value })}
                    placeholder="e.g. Night attendant"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Costing</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="input tabular-nums"
                    value={subService.rate}
                    onChange={(e) => updateSubService(index, { rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Description</label>
                  <input
                    className="input"
                    value={subService.description}
                    onChange={(e) => updateSubService(index, { description: e.target.value })}
                    placeholder="Short text shown on homepage"
                  />
                </div>
                <button
                  type="button"
                  className="btn-outline !py-2 text-xs"
                  onClick={() => removeDraftSubService(index)}
                  disabled={form.subServices.length === 1}
                >
                  Remove
                </button>
                </div>
                <AdminServiceImageField
                  compact
                  imageUrl={subService.imageUrl}
                  onUpload={async (file) => {
                    try {
                      const imageUrl = await imageFileToDataUrl(file);
                      updateSubService(index, { imageUrl });
                    } catch (err) {
                      toast.error(err.message || 'Could not read image');
                    }
                  }}
                  onRemove={() => updateSubService(index, { imageUrl: '' })}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={saving}>
              {saving ? 'Adding...' : 'Add service'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-glass-border/60 pb-3">
          <div>
            <h3 className="font-semibold text-foreground">Existing services</h3>
            <p className="text-xs text-muted">
              {SERVICE_SECTIONS.length + sections.length} service section
              {SERVICE_SECTIONS.length + sections.length === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Default homepage services
            </p>
            <div className="space-y-3">
              {SERVICE_SECTIONS.map((section) => {
                const sectionHidden = defaultSectionHidden(section);
                return (
                  <div key={section.id} className="rounded-2xl border border-glass-border/60 bg-glass/25 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-foreground">{section.title}</h4>
                          <span className="badge bg-slate-500/10 text-muted border border-glass-border/60">Default</span>
                          <span
                            className={`badge border ${
                              sectionHidden
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                            }`}
                          >
                            {sectionHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{section.tagline}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/25">
                          {section.services.length} sub-service{section.services.length === 1 ? '' : 's'}
                        </span>
                        <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => toggleDefaultSection(section)}>
                          {sectionHidden ? 'Show' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200 text-xs font-semibold"
                          onClick={() => removeDefaultSection(section)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {section.services.map((service) => {
                        const serviceHidden = defaultSubServiceHidden(section, service);
                        return (
                          <div key={service.id} className="rounded-xl border border-glass-border/50 bg-glass/25 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-foreground">{service.laymanName}</p>
                                <p className="text-xs text-muted mt-1">{service.legacyName || 'Default sub-service'}</p>
                              </div>
                              <span
                                className={`badge border ${
                                  serviceHidden
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                }`}
                              >
                                {serviceHidden ? 'Hidden' : 'Visible'}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{service.description || service.tagline}</p>
                            <AdminServiceImageField
                              compact
                              imageUrl={defaultServiceImage(section.id, service.id)}
                              onUpload={(file) => uploadDefaultServiceImage(section, service, file)}
                              onRemove={() => removeDefaultServiceImage(section, service)}
                            />
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                className="btn-outline !py-1 !px-2.5 text-xs"
                                onClick={() => toggleDefaultSubService(section, service)}
                              >
                                {serviceHidden ? 'Show' : 'Hide'}
                              </button>
                              <button
                                type="button"
                                className="text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200 text-xs font-semibold"
                                onClick={() => removeDefaultSubService(section, service)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Admin-created services
            </p>
          {sections.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">No admin-created services yet.</p>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="rounded-2xl border border-glass-border/60 bg-glass/25 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">{section.title}</h4>
                      <span
                        className={`badge border ${
                          section.active === false
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        }`}
                      >
                        {section.active === false ? 'Hidden' : 'Visible'}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{section.tagline}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/25">
                      {(section.services || []).length} sub-service{(section.services || []).length === 1 ? '' : 's'}
                    </span>
                    <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => toggleSection(section)}>
                      {section.active === false ? 'Show' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200 text-xs font-semibold"
                      onClick={() => removeSection(section)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(section.services || []).map((service) => (
                    <div key={service.id} className="rounded-xl border border-glass-border/50 bg-glass/25 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{service.laymanName}</p>
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mt-1 tabular-nums">
                            {fmtInr(service.rate)}
                          </p>
                        </div>
                        <span
                          className={`badge border ${
                            service.active === false
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                          }`}
                        >
                          {service.active === false ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{service.description || service.tagline}</p>
                      <AdminServiceImageField
                        compact
                        imageUrl={service.imageUrl || null}
                        onUpload={(file) => uploadAdminServiceImage(section, service, file)}
                        onRemove={() => removeAdminServiceImage(section, service)}
                      />
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn-outline !py-1 !px-2.5 text-xs"
                          onClick={() => toggleSubService(section, service)}
                        >
                          {service.active === false ? 'Show' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200 text-xs font-semibold"
                          onClick={() => removeSubService(section, service)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServices;
