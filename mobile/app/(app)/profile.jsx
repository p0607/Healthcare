/**
 * Profile — comprehensive healthcare profile with timeline + editable sections.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  buildHealthProfilePayload,
  buildGuardianProfileTabs,
  defaultHealthProfile,
  emptyEmergencyContact,
  emptyGuardian,
  emptyInsurancePolicy,
  formFromUser,
  guardianProvisionReady,
  initialsFromName,
  isGuardianSession,
  MAX_EMERGENCY_CONTACTS,
  patientProfileCompletion,
  SEX_AT_BIRTH_OPTIONS,
  visibleEmergencyContactCount,
} from '@nursecare/shared';
import { api } from '../../src/api/client';
import Button from '../../src/components/Button';
import ChangePasswordForm from '../../src/components/ChangePasswordForm';
import GuardianAccountPanel from '../../src/components/GuardianAccountPanel';
import ProfileCompletionTimeline from '../../src/components/ProfileCompletionTimeline';
import ProfileCompletionPie, { ProfileCompletionSummary } from '../../src/components/ProfileCompletionPie';
import ProfileTabBar from '../../src/components/ProfileTabBar';
import AppScreenHeader from '../../src/components/AppScreenHeader';
import SelectField from '../../src/components/SelectField';
import TextField from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { saveCachedUser } from '../../src/storage/session';
import { colors, fontSize, radius, spacing } from '../../src/theme/theme';

function SectionCard({ title, done, open, onToggle, children }) {
  return (
    <View style={styles.sectionCard}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={[styles.sectionBadge, done ? styles.sectionBadgeDone : styles.sectionBadgePending]}>
            {done ? 'Complete' : 'Pending'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, setUser, logout, hydrating } = useAuth();
  const router = useRouter();
  const scrollRef = useRef(null);
  const sectionOffsets = useRef({});
  const isGuardian = isGuardianSession(user);
  const [activeTab, setActiveTab] = useState('self');
  const [linkedPatients, setLinkedPatients] = useState(() =>
    Array.isArray(user?.linkedPatients) ? user.linkedPatients : []
  );
  const [profileSubject, setProfileSubject] = useState(user);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [form, setForm] = useState(() => formFromUser(user));
  const [openSection, setOpenSection] = useState('demographics');
  const [saving, setSaving] = useState(false);
  const [linkedGuardians, setLinkedGuardians] = useState(() =>
    Array.isArray(user?.linkedGuardians) ? user.linkedGuardians : user?.linkedGuardian ? [user.linkedGuardian] : []
  );

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

  const activePatientId = useMemo(() => {
    if (activeTab.startsWith('patient:')) return activeTab.replace('patient:', '');
    return null;
  }, [activeTab]);

  const profilePanel = useMemo(() => {
    if (!isGuardian) return 'health';
    if (activeTab === 'self') return 'guardian-account';
    if (activeTab === 'my-patient') return 'health';
    if (activePatientId) return 'health';
    return 'guardian-account';
  }, [isGuardian, activeTab, activePatientId]);

  useEffect(() => {
    if (!isGuardian) {
      setForm(formFromUser(user, linkedGuardians[0] || user?.linkedGuardian));
      setProfileSubject(user);
    }
  }, [user, isGuardian]);

  useEffect(() => {
    if (!isGuardian) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me/patients');
        if (cancelled) return;
        setLinkedPatients(data.patients || []);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuardian]);

  useEffect(() => {
    if (!isGuardian) return undefined;
    if (activeTab === 'self') {
      setLoadingProfile(false);
      return undefined;
    }

    let cancelled = false;

    if (activeTab === 'my-patient') {
      setLoadingProfile(false);
      setProfileSubject(user);
      setForm(formFromUser(user, linkedGuardians[0] || user?.linkedGuardian));
      setOpenSection('demographics');
      return undefined;
    }

    if (!activePatientId) return undefined;

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
        if (!cancelled) {
          Alert.alert('Error', err?.response?.data?.message || 'Could not load patient profile');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, activePatientId, isGuardian, user]);

  useEffect(() => {
    if (isGuardian) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me/guardian');
        if (cancelled) return;
        const list = data.guardians?.length ? data.guardians : data.guardian ? [data.guardian] : [];
        setLinkedGuardians(list);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedEmails = useMemo(
    () => new Set(linkedGuardians.map((g) => String(g.email || '').toLowerCase()).filter(Boolean)),
    [linkedGuardians]
  );

  const isGuardianLinked = (g) => linkedEmails.has(String(g?.email || '').toLowerCase());

  const userId = user?._id || user?.id || '';
  const hp = useMemo(() => {
    const raw = form?.healthProfile;
    if (raw && typeof raw === 'object' && raw.demographics) return raw;
    return defaultHealthProfile(userId);
  }, [form?.healthProfile, userId]);
  const demographics = hp.demographics || {};
  const medicalBaseline = hp.medicalBaseline || defaultHealthProfile(userId).medicalBaseline;
  const employmentAndLifestyle = hp.employmentAndLifestyle || defaultHealthProfile(userId).employmentAndLifestyle;
  const insuranceDetails = hp.insuranceDetails || defaultHealthProfile(userId).insuranceDetails;
  const completion = useMemo(
    () =>
      patientProfileCompletion(
        { ...profileSubject, ...form, healthProfile: hp, location: { address: form.address } },
        linkedGuardians[0] || profileSubject?.linkedGuardian
      ),
    [profileSubject, form, hp, linkedGuardians]
  );

  const setDemo = (key, value) =>
    setForm((f) => {
      const base = f.healthProfile?.demographics ? f.healthProfile : defaultHealthProfile(userId);
      return {
        ...f,
        healthProfile: {
          ...base,
          demographics: { ...(base.demographics || {}), [key]: value },
        },
      };
    });

  const updateEmergency = (index, patch) =>
    setForm((f) => {
      const list = [...(f.healthProfile.emergencyContacts || [])];
      list[index] = { ...(list[index] || emptyEmergencyContact(index + 1)), ...patch };
      return { ...f, healthProfile: { ...f.healthProfile, emergencyContacts: list } };
    });

  const updateGuardian = (index, patch) =>
    setForm((f) => {
      const list = [...(f.healthProfile.guardians?.length ? f.healthProfile.guardians : [emptyGuardian()])];
      list[index] = { ...list[index], ...patch };
      return { ...f, healthProfile: { ...f.healthProfile, guardians: list } };
    });

  const addGuardian = () =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        guardians: [...(f.healthProfile.guardians?.length ? f.healthProfile.guardians : [emptyGuardian()]), emptyGuardian()],
      },
    }));

  const removeGuardian = (index) =>
    setForm((f) => ({
      ...f,
      healthProfile: {
        ...f.healthProfile,
        guardians: (f.healthProfile.guardians || []).filter((_, i) => i !== index),
      },
    }));

  const addEmergencyContact = () =>
    setForm((f) => {
      const count = visibleEmergencyContactCount(f.healthProfile.emergencyContacts);
      if (count >= MAX_EMERGENCY_CONTACTS) return f;
      return {
        ...f,
        healthProfile: {
          ...f.healthProfile,
          emergencyContacts: [...(f.healthProfile.emergencyContacts || []), emptyEmergencyContact(count + 1)],
        },
      };
    });

  const updatePolicy = (index, patch) =>
    setForm((f) => {
      const policies = [...(f.healthProfile.insuranceDetails.policies?.length ? f.healthProfile.insuranceDetails.policies : [emptyInsurancePolicy()])];
      policies[index] = { ...policies[index], ...patch };
      return {
        ...f,
        healthProfile: {
          ...f.healthProfile,
          insuranceDetails: { ...f.healthProfile.insuranceDetails, policies },
        },
      };
    });

  const scrollToSection = (id) => {
    setOpenSection(id);
    const y = sectionOffsets.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = buildHealthProfilePayload(form, profileSubject?._id || profileSubject?.id);
      payload.location = {
        address: form.address,
        ...(profileSubject?.location?.coordinates?.length === 2
          ? { coordinates: profileSubject.location.coordinates }
          : user?.location?.coordinates?.length === 2
            ? { coordinates: user.location.coordinates }
            : {}),
      };

      let data;
      if (isGuardian && activePatientId) {
        ({ data } = await api.patch(`/auth/me/patients/${activePatientId}/profile`, payload));
      } else {
        ({ data } = await api.patch('/auth/me/profile', payload));
        if (activeTab === 'my-patient' || !isGuardian) {
          setUser(data.user);
          await saveCachedUser(data.user);
        }
      }

      if (data.user) {
        setProfileSubject(data.user);
        const freshLinked =
          data.user?.linkedGuardians?.length
            ? data.user.linkedGuardians
            : data.user?.linkedGuardian
              ? [data.user.linkedGuardian]
              : linkedGuardians;
        setLinkedGuardians(freshLinked);
      }

      const created = (data.provisionedGuardians || []).filter((g) => g.created && g.temporaryPassword);
      if (created.length) {
        Alert.alert(
          'Guardian account created',
          created
            .map(
              (g) =>
                `${g.name} (${g.email})\nTemporary password: ${g.temporaryPassword}\nThey can sign in and change it under Profile.`
            )
            .join('\n\n')
        );
      } else {
        Alert.alert('Saved', data.message || 'Profile saved.');
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const emergencyCount = visibleEmergencyContactCount(hp.emergencyContacts);
  const guardians = hp.guardians?.length ? hp.guardians : [emptyGuardian()];
  const sections = completion.sections || {};
  const headerName =
    profilePanel === 'guardian-account'
      ? user?.name
      : profileSubject?.patientFullName || profileSubject?.name || user?.name;
  const headerEmail = profilePanel === 'guardian-account' ? user?.email : profileSubject?.email;

  const renderHealthProfileSections = () => (
    <>
        <View style={styles.completionRow}>
          <ProfileCompletionPie completion={completion} size={88} />
          <ProfileCompletionSummary completion={completion} />
        </View>

        <ProfileCompletionTimeline completion={completion} onStepPress={scrollToSection} />

        <View
          onLayout={(e) => { sectionOffsets.current.demographics = e.nativeEvent.layout.y; }}
        >
          <SectionCard
            title="Demographics"
            done={sections.demographics}
            open={openSection === 'demographics'}
            onToggle={() => setOpenSection((s) => (s === 'demographics' ? '' : 'demographics'))}
          >
            <TextField label="Legal first name *" value={demographics.legalFirstName || ''} onChangeText={(v) => setDemo('legalFirstName', v)} />
            <TextField label="Legal last name *" value={demographics.legalLastName || ''} onChangeText={(v) => setDemo('legalLastName', v)} />
            <TextField label="Preferred name" value={demographics.preferredName || ''} onChangeText={(v) => setDemo('preferredName', v)} />
            <TextField label="Date of birth (YYYY-MM-DD) *" value={demographics.dateOfBirth || ''} onChangeText={(v) => setDemo('dateOfBirth', v)} placeholder="1990-01-15" />
            <SelectField
              label="Sex assigned at birth *"
              value={demographics.sexAssignedAtBirth || ''}
              onChange={(v) => setDemo('sexAssignedAtBirth', v)}
              options={SEX_AT_BIRTH_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
            />
            <TextField label="Gender identity" value={demographics.genderIdentity || ''} onChangeText={(v) => setDemo('genderIdentity', v)} />
            <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
            <TextField label="Home address *" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} multiline style={{ minHeight: 72 }} />
          </SectionCard>
        </View>

        <View onLayout={(e) => { sectionOffsets.current.guardians = e.nativeEvent.layout.y; }}>
          <SectionCard
            title="Guardians"
            done={sections.guardians}
            open={openSection === 'guardians'}
            onToggle={() => setOpenSection((s) => (s === 'guardians' ? '' : 'guardians'))}
          >
            <Text style={styles.hint}>
              Add guardians with name, phone, and email. A login is created automatically with a temporary password they can reset after signing in.
            </Text>
            {guardians.map((g, i) => {
              const linked = isGuardianLinked(g);
              return (
                <View key={`guardian-${i}`} style={styles.subBlock}>
                  <View style={styles.subHeaderRow}>
                    <Text style={styles.subTitle}>Guardian {i + 1}</Text>
                    {!linked && guardians.length > 1 ? (
                      <Pressable onPress={() => removeGuardian(i)} hitSlop={8}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {linked ? (
                    <Text style={styles.linkedNote}>Linked account — details are read-only.</Text>
                  ) : null}
                  <TextField label="Full name *" value={g.fullName} editable={!linked} onChangeText={(v) => updateGuardian(i, { fullName: v })} />
                  <TextField label="Relationship *" value={g.relationshipToUser} editable={!linked} onChangeText={(v) => updateGuardian(i, { relationshipToUser: v })} placeholder="Mother, Legal Guardian…" />
                  <TextField label="Phone *" value={g.phone} editable={!linked} onChangeText={(v) => updateGuardian(i, { phone: v })} keyboardType="phone-pad" />
                  <TextField label="Email *" value={g.email} editable={!linked} onChangeText={(v) => updateGuardian(i, { email: v })} keyboardType="email-address" autoCapitalize="none" />
                  {guardianProvisionReady(g) && !linked ? (
                    <Text style={styles.readyNote}>Ready — save profile to create guardian login.</Text>
                  ) : null}
                </View>
              );
            })}
            <Pressable style={styles.addBtn} onPress={addGuardian}>
              <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
              <Text style={styles.addBtnText}>Add guardian</Text>
            </Pressable>
          </SectionCard>
        </View>

        <View onLayout={(e) => { sectionOffsets.current.emergencyContacts = e.nativeEvent.layout.y; }}>
          <SectionCard
            title="Emergency contacts"
            done={sections.emergencyContacts}
            open={openSection === 'emergencyContacts'}
            onToggle={() => setOpenSection((s) => (s === 'emergencyContacts' ? '' : 'emergencyContacts'))}
          >
            {Array.from({ length: emergencyCount }, (_, i) => {
              const c = hp.emergencyContacts[i] || emptyEmergencyContact(i + 1);
              return (
                <View key={i} style={styles.subBlock}>
                  <Text style={styles.subTitle}>Contact {i + 1}</Text>
                  <TextField label="Full name *" value={c.fullName} onChangeText={(v) => updateEmergency(i, { fullName: v })} />
                  <TextField label="Relationship *" value={c.relationship} onChangeText={(v) => updateEmergency(i, { relationship: v })} />
                  <TextField label="Primary phone *" value={c.primaryPhone} onChangeText={(v) => updateEmergency(i, { primaryPhone: v })} keyboardType="phone-pad" />
                  <TextField label="Secondary phone" value={c.secondaryPhone} onChangeText={(v) => updateEmergency(i, { secondaryPhone: v })} keyboardType="phone-pad" />
                  <TextField label="Priority (1-5) *" value={String(c.priorityOrder || i + 1)} onChangeText={(v) => updateEmergency(i, { priorityOrder: Number(v) || i + 1 })} keyboardType="number-pad" />
                  <TextField label="Email" value={c.email} onChangeText={(v) => updateEmergency(i, { email: v })} keyboardType="email-address" autoCapitalize="none" />
                </View>
              );
            })}
            {emergencyCount < MAX_EMERGENCY_CONTACTS ? (
              <Pressable style={styles.addBtn} onPress={addEmergencyContact}>
                <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                <Text style={styles.addBtnText}>Add emergency contact</Text>
              </Pressable>
            ) : null}
          </SectionCard>
        </View>

        <View onLayout={(e) => { sectionOffsets.current.medicalBaseline = e.nativeEvent.layout.y; }}>
          <SectionCard
            title="Medical baseline"
            done={sections.medicalBaseline}
            open={openSection === 'medicalBaseline'}
            onToggle={() => setOpenSection((s) => (s === 'medicalBaseline' ? '' : 'medicalBaseline'))}
          >
            <TextField
              label="Blood type"
              value={medicalBaseline.bloodType || ''}
              onChangeText={(v) =>
                setForm((f) => {
                  const base = f.healthProfile?.medicalBaseline ? f.healthProfile : defaultHealthProfile(userId);
                  return {
                    ...f,
                    healthProfile: {
                      ...base,
                      medicalBaseline: { ...(base.medicalBaseline || {}), bloodType: v },
                    },
                  };
                })
              }
              placeholder="A+, O-, Unknown"
            />
            <TextField
              label="Chronic conditions (comma-separated)"
              value={(medicalBaseline.chronicConditions || []).join(', ')}
              onChangeText={(v) =>
                setForm((f) => {
                  const base = f.healthProfile?.medicalBaseline ? f.healthProfile : defaultHealthProfile(userId);
                  return {
                    ...f,
                    healthProfile: {
                      ...base,
                      medicalBaseline: {
                        ...(base.medicalBaseline || {}),
                        chronicConditions: v.split(',').map((s) => s.trim()).filter(Boolean),
                      },
                    },
                  };
                })
              }
            />
          </SectionCard>
        </View>

        <View onLayout={(e) => { sectionOffsets.current.employmentAndLifestyle = e.nativeEvent.layout.y; }}>
          <SectionCard
            title="Employment & lifestyle"
            done={sections.employmentAndLifestyle}
            open={openSection === 'employmentAndLifestyle'}
            onToggle={() => setOpenSection((s) => (s === 'employmentAndLifestyle' ? '' : 'employmentAndLifestyle'))}
          >
            <TextField
              label="Employment status"
              value={employmentAndLifestyle.employmentStatus || ''}
              onChangeText={(v) =>
                setForm((f) => {
                  const base = f.healthProfile ? f.healthProfile : defaultHealthProfile(userId);
                  return {
                    ...f,
                    healthProfile: {
                      ...base,
                      employmentAndLifestyle: { ...(base.employmentAndLifestyle || {}), employmentStatus: v },
                    },
                  };
                })
              }
              placeholder="Full-time, Retired…"
            />
            <TextField
              label="Occupation"
              value={employmentAndLifestyle.occupation || ''}
              onChangeText={(v) =>
                setForm((f) => {
                  const base = f.healthProfile ? f.healthProfile : defaultHealthProfile(userId);
                  return {
                    ...f,
                    healthProfile: {
                      ...base,
                      employmentAndLifestyle: { ...(base.employmentAndLifestyle || {}), occupation: v },
                    },
                  };
                })
              }
            />
          </SectionCard>
        </View>

        <View onLayout={(e) => { sectionOffsets.current.insuranceDetails = e.nativeEvent.layout.y; }}>
          <SectionCard
            title="Insurance"
            done={sections.insuranceDetails}
            open={openSection === 'insuranceDetails'}
            onToggle={() => setOpenSection((s) => (s === 'insuranceDetails' ? '' : 'insuranceDetails'))}
          >
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Has insurance</Text>
              <Switch
                value={insuranceDetails.hasInsurance === true}
                onValueChange={(v) =>
                  setForm((f) => {
                    const base = f.healthProfile ? f.healthProfile : defaultHealthProfile(userId);
                    return {
                      ...f,
                      healthProfile: {
                        ...base,
                        insuranceDetails: { ...(base.insuranceDetails || {}), hasInsurance: v },
                      },
                    };
                  })
                }
              />
            </View>
            {insuranceDetails.hasInsurance ? (
              <>
                <TextField label="Provider name *" value={insuranceDetails.policies?.[0]?.providerName || ''} onChangeText={(v) => updatePolicy(0, { providerName: v })} />
                <TextField label="Policy ID *" value={insuranceDetails.policies?.[0]?.policyId || ''} onChangeText={(v) => updatePolicy(0, { policyId: v })} />
                <TextField label="Group ID" value={insuranceDetails.policies?.[0]?.groupId || ''} onChangeText={(v) => updatePolicy(0, { groupId: v })} />
              </>
            ) : null}
          </SectionCard>
        </View>

        <Button title={saving ? 'Saving…' : 'Save profile'} onPress={saveProfile} disabled={saving} />

        {!isGuardian ? (
          <View style={styles.card}>
            <ChangePasswordForm />
          </View>
        ) : null}

        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppScreenHeader title="Profile" />
      {hydrating || !user ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      ) : (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromName(headerName)}</Text>
          </View>
          <Text style={styles.name}>{headerName || 'Guest'}</Text>
          {headerEmail ? <Text style={styles.email}>{headerEmail}</Text> : null}
        </View>

        {isGuardian ? (
          <ProfileTabBar tabs={profileTabs} activeId={activeTab} onChange={setActiveTab} />
        ) : null}

        {profilePanel === 'guardian-account' ? (
          <>
            <GuardianAccountPanel user={user} setUser={setUser} />
            <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </>
        ) : null}

        {profilePanel === 'health' && loadingProfile ? (
          <Text style={styles.loadingText}>Loading profile…</Text>
        ) : null}

        {profilePanel === 'health' && !loadingProfile ? renderHealthProfileSections() : null}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.brand },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.muted },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  sectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  sectionBadge: { fontSize: fontSize.xs, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  sectionBadgeDone: { backgroundColor: '#d1fae5', color: '#059669' },
  sectionBadgePending: { backgroundColor: '#ffe4e6', color: colors.danger },
  sectionBody: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  subBlock: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  subHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.muted },
  hint: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginBottom: spacing.sm },
  linkedNote: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
  readyNote: { fontSize: fontSize.xs, color: colors.brand, fontWeight: '600' },
  removeText: { fontSize: fontSize.xs, color: colors.danger, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addBtnText: { color: colors.brand, fontWeight: '700', fontSize: fontSize.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },
  pressed: { opacity: 0.8 },
  loadingText: { textAlign: 'center', color: colors.muted, fontSize: fontSize.sm, paddingVertical: spacing.lg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
