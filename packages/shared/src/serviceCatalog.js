/**
 * Service catalog — the four care pillars and their sub-services, as PURE DATA.
 *
 * This mirrors the web app's `frontend/src/lib/serviceSections.js`, but with no
 * React icon components or Tailwind class strings (those don't exist in React
 * Native). Each client maps `iconKey` / `serviceType` to its own UI.
 *
 * `serviceType` (when present) is the bookable booking-tab a sub-service maps to:
 *   nurse_visit | doctor_consult | physiotherapy | emergency
 * Sub-services without a serviceType are informational / register-to-enquire.
 */
export const SERVICE_PILLARS = [
  {
    id: 'smart-care',
    title: 'Smart Care',
    tagline: 'Smart tech that watches, helps, and gives families peace of mind.',
    iconKey: 'sparkles',
    accent: '#8b5cf6',
    services: [
      {
        id: 'careguard-ai',
        name: 'CareGuard AI',
        tagline: 'Always watching, so you never have to worry',
        description:
          'AI-powered video and vitals monitoring that watches for falls, distress, or unusual activity and alerts you instantly.',
        highlights: ['Fall & distress detection', 'Private family feeds', 'Instant caregiver alerts'],
      },
      {
        id: 'carebot-companion',
        name: 'CareBot Companion',
        tagline: 'A helping hand, always by your side',
        description:
          'A friendly robotic companion for medication reminders, daily routines, and staying connected with loved ones.',
        highlights: ['Medication reminders', 'Hands-free video calls', 'Companionship prompts'],
      },
    ],
  },
  {
    id: 'lifeline-care',
    title: 'LifeLine Care',
    tagline: 'Urgent help, hospital support, and a calm hand around every admission.',
    iconKey: 'pulse',
    accent: '#f43f5e',
    services: [
      {
        id: 'rapid-relief',
        name: 'Rapid Relief',
        tagline: 'Help rushes to you when every second counts',
        serviceType: 'emergency',
        description:
          'Emergency response with paramedic-led ambulances and live ETA tracking, coordinated with the nearest hospital.',
        highlights: ['24/7 ambulance dispatch', 'Live GPS tracking', 'Hospital pre-arrival coordination'],
      },
      {
        id: 'bedside-companion',
        name: 'BedSide Companion',
        tagline: "You're never alone through a hospital stay",
        description:
          'A trained companion stays through admission, procedures, and recovery, handling care logistics for the family.',
        highlights: ['Round-the-clock support', 'Hospital staff coordination', 'Real-time family updates'],
      },
      {
        id: 'homecoming-care',
        name: 'Homecoming Care',
        tagline: "Healing continues where you're most comfortable — home",
        description:
          'Structured post-discharge programs: nursing visits, wound and vitals checks, physio, meals, and family updates.',
        highlights: ['Personalised recovery plan', 'Nurse & physio visits', 'Family progress dashboard'],
      },
      {
        id: 'prepare-reassure',
        name: 'Prepare & Reassure',
        tagline: 'Everything in place before you step into a hospital',
        description:
          'Pre-admission coordination: paperwork, fasting plans, transport, and a familiar caregiver at admission.',
        highlights: ['Admission paperwork', 'Pre-op coaching', 'Door-to-bed transport'],
      },
    ],
  },
  {
    id: 'healing-at-home',
    title: 'Healing at Home',
    tagline: 'Doctors, nurses, physio, medicines, and tests — all at your door.',
    iconKey: 'home',
    accent: '#0a9bf0',
    services: [
      {
        id: 'healing-hands',
        name: 'Healing Hands',
        tagline: 'Compassionate nursing, brought to your door',
        serviceType: 'nurse_visit',
        description:
          'Licensed nurses for IV, injections, wound care, vitals, catheter care, and post-operative nursing at home.',
        highlights: ['IV, injections & wound care', 'Vitals & post-op monitoring', 'Verified nurses'],
      },
      {
        id: 'doctor-at-door',
        name: 'Doctor at Your Door',
        tagline: 'Expert advice without leaving your home',
        serviceType: 'doctor_consult',
        description:
          'Speak with a licensed physician by video in minutes, or book a home consultation for in-person care.',
        highlights: ['Video consult under 8 min', 'Home visit option', 'Senior priority queue'],
      },
      {
        id: 'carescript',
        name: 'CareScript',
        tagline: 'Your prescriptions, delivered with care',
        description:
          'Prescription fulfilment with verified pharmacies, refill reminders, and home delivery.',
        highlights: ['Verified pharmacies', 'Refill reminders', 'Doorstep delivery'],
      },
      {
        id: 'move-mend',
        name: 'Move & Mend',
        tagline: 'Gentle therapy to get you moving again',
        serviceType: 'physiotherapy',
        description:
          'In-home physiotherapy for post-surgery mobility, chronic pain, and senior strength with progress tracking.',
        highlights: ['Personalised rehab plan', 'Pain & mobility recovery', 'Progress notes'],
      },
      {
        id: 'healthclarity',
        name: 'HealthClarity',
        tagline: 'Answers to what your body is telling you',
        description:
          'At-home sample collection for blood work, imaging coordination, and a clinician-reviewed summary.',
        highlights: ['Home sample pickup', 'Imaging coordination', 'Clinician-reviewed reports'],
      },
    ],
  },
  {
    id: 'thrive-well',
    title: 'Thrive Well',
    tagline: 'Stay strong, eat right, and protect what matters — every day.',
    iconKey: 'flower',
    accent: '#10b981',
    services: [
      {
        id: 'breathe-balance',
        name: 'Breathe & Balance',
        tagline: 'Find stillness, strength, and peace within',
        description:
          'Certified yoga instructors guide sessions for stress, posture, prenatal care, and senior mobility.',
        highlights: ['Vetted instructors', 'Live online or in-home', 'Programs for every age'],
      },
      {
        id: 'revive-restore',
        name: 'Revive & Restore',
        tagline: 'Active recovery for a life in full motion',
        serviceType: 'physiotherapy',
        description:
          'Preventive and performance physiotherapy: sports recovery, posture correction, and mobility plans.',
        highlights: ['Sports & posture recovery', 'Mobility & strength plans', 'Track progress'],
      },
      {
        id: 'nourish-flourish',
        name: 'Nourish & Flourish',
        tagline: 'Food that loves your body back',
        description:
          'Dietitian-planned meals and nutrition coaching: recovery trays, diabetic plans, and senior menus.',
        highlights: ['Dietitian menus', 'Diabetic & recovery plans', 'Scheduled delivery'],
      },
      {
        id: 'wholeness-hub',
        name: 'Wholeness Hub',
        tagline: 'A place where every part of you is cared for',
        description:
          'Integrated wellness check-ins covering body, mind, and lifestyle with care plans you can follow from home.',
        highlights: ['Holistic assessment', 'Mind, body & lifestyle plan', 'Clinic or in-home follow-ups'],
      },
      {
        id: 'stayahead-health',
        name: 'StayAhead Health',
        tagline: 'Catch it early, live fully',
        description:
          'Annual preventive panels, screenings, and proactive monitoring tailored to age and risk.',
        highlights: ['Risk-based screenings', 'Annual benchmark', 'Clinician follow-up'],
      },
      {
        id: 'careshield',
        name: 'CareShield',
        tagline: 'Protection that holds you when life gets uncertain',
        description:
          'Health & care insurance navigation: claims help, cashless coordination, and plan-fit guidance.',
        highlights: ['Claims & cashless support', 'Network hospital coordination', 'Plan-fit guidance'],
      },
    ],
  },
];

/** Flat list of every sub-service, tagged with its pillar. */
export const ALL_CATALOG_SERVICES = SERVICE_PILLARS.flatMap((pillar) =>
  pillar.services.map((service) => ({
    ...service,
    pillarId: pillar.id,
    pillarTitle: pillar.title,
  }))
);

/** Only the sub-services that map to a bookable caregiver service type. */
export const BOOKABLE_SERVICES = ALL_CATALOG_SERVICES.filter((s) => Boolean(s.serviceType));

/**
 * The four Homecare service-type cards shown on the patient dashboard,
 * mirroring the web app's `serviceCategoryCards.js` (SERVICE_CATEGORY_DEFAULTS).
 * `iconKey` is mapped to an icon per client.
 */
export const SERVICE_CATEGORY_CARDS = [
  { id: 'nurse', label: 'Nurse visit', serviceType: 'nurse_visit', subtitle: 'Nursing at home', iconKey: 'nurse' },
  { id: 'doctor', label: 'Doctor', serviceType: 'doctor_consult', subtitle: 'Doctor consultation', iconKey: 'doctor' },
  { id: 'physio', label: 'Physio', serviceType: 'physiotherapy', subtitle: 'Physiotherapy', iconKey: 'physio' },
  { id: 'emergency', label: 'Emergency', serviceType: 'emergency', subtitle: 'Urgent response', iconKey: 'emergency' },
];
