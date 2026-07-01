import {
  Activity,
  Apple,
  Bot,
  Building2,
  ClipboardCheck,
  Eye,
  FlaskConical,
  Flower2,
  HeartPulse,
  Home,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';

/** User-provided images in public/images/service-subservices */
const SUBSERVICE_IMAGE_FILES = {
  'careguard-ai': 'careguard ai.jpg',
  'carebot-companion': 'carebot-companion.jpg',
  'rapid-relief': 'Rapid relief.jpg',
  'bedside-companion': 'Bedside companion.jpg',
  'homecoming-care': 'Homecoming.jpg',
  'prepare-reassure': 'Prepare and reassure.jpg',
  'healing-hands': 'Healing hands.jpg',
  'doctor-at-door': 'Doctor on call.jpg',
  carescript: 'Carescript medicine.jpg',
  'move-mend': 'Move and mend.jpg',
  healthclarity: 'Healthclarity diagnostic.jpg',
  'breathe-balance': 'Breath and balance.jpg',
  'revive-restore': 'Revive and restore.jpg',
  'nourish-flourish': 'Nourish and flourish.jpg',
  'wholeness-hub': 'Wholeness hub.jpg',
  'stayahead-health': 'stayahead health.jpg',
  careshield: 'careshield.jpg',
};

export function subserviceImageSrc(serviceId) {
  const file = SUBSERVICE_IMAGE_FILES[serviceId];
  if (!file) return null;
  return `${import.meta.env.BASE_URL}images/service-subservices/${encodeURIComponent(file)}`;
}

/** Four care pillars — single source of truth for marketing & navigation. */
export const SERVICE_SECTIONS = [
  {
    id: 'smart-care',
    title: 'Smart Care',
    formerName: 'Tech',
    tagline: 'Smart tech that watches, helps, and gives families peace of mind.',
    Icon: Sparkles,
    accent:
      'bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-300',
    imageSrc: `${import.meta.env.BASE_URL}images/service-pillars/smart-care.jpg`,
    imageBorderColor: '#c4b5fd',
    services: [
      {
        id: 'careguard-ai',
        imageSrc: subserviceImageSrc('careguard-ai'),
        laymanName: 'CareGuard AI',
        tagline: 'Always watching, so you never have to worry',
        legacyName: 'AI Monitoring',
        description:
          'AI-powered video and vitals monitoring that quietly watches for falls, distress, or unusual activity — and alerts you the moment something needs attention.',
        highlights: [
          'Fall & distress detection',
          'Private, family-controlled feeds',
          'Instant alerts to caregivers',
        ],
        to: '/register#smart-care',
      },
      {
        id: 'carebot-companion',
        imageSrc: `${import.meta.env.BASE_URL}images/service-subservices/carebot-companion.jpg`,
        laymanName: 'CareBot Companion',
        tagline: 'A helping hand, always by your side',
        legacyName: 'Robotic Assistant',
        description:
          'A friendly robotic companion that reminds about medication, helps with daily routines, and stays connected with loved ones and clinicians.',
        highlights: [
          'Medication & routine reminders',
          'Hands-free family video calls',
          'Companionship & cognitive prompts',
        ],
        to: '/register#smart-care',
      },
    ],
  },
  {
    id: 'lifeline-care',
    title: 'LifeLine Care',
    formerName: 'Emergency Response & Pre/Post Hospitalisation',
    tagline: 'Urgent help, hospital support, and a calm hand around every admission.',
    Icon: HeartPulse,
    accent:
      'bg-gradient-to-br from-rose-500/20 to-orange-500/10 border-rose-500/30 text-rose-300',
    imageSrc: `${import.meta.env.BASE_URL}images/service-pillars/lifeline-care.jpg`,
    imageBorderColor: '#fda4af',
    services: [
      {
        id: 'rapid-relief',
        imageSrc: subserviceImageSrc('rapid-relief'),
        laymanName: 'Rapid Relief',
        tagline: 'Help rushes to you when every second counts',
        legacyName: 'ER Service',
        serviceType: 'emergency',
        description:
          'Emergency response with paramedic-led ambulances and live ETA tracking — coordinated with the nearest hospital before the team arrives.',
        highlights: [
          '24/7 ambulance dispatch',
          'Live GPS tracking',
          'Hospital pre-arrival coordination',
        ],
        to: '/register',
      },
      {
        id: 'bedside-companion',
        imageSrc: subserviceImageSrc('bedside-companion'),
        laymanName: 'BedSide Companion',
        tagline: "You're never alone through a hospital stay",
        legacyName: 'Hospitalisation',
        description:
          'A trained companion stays by the patient through admission, procedures, and recovery — handling care logistics so family can focus on healing.',
        highlights: [
          'Round-the-clock bedside support',
          'Coordination with hospital staff',
          'Updates to family in real time',
        ],
        to: '/register#lifeline-care',
      },
      {
        id: 'homecoming-care',
        imageSrc: `${import.meta.env.BASE_URL}images/service-subservices/homecoming-care.jpg`,
        laymanName: 'Homecoming Care',
        tagline: "Healing continues where you're most comfortable — home",
        legacyName: 'Post Hospital Care',
        description:
          'Structured post-discharge programs: nursing visits, wound and vitals checks, physio, meals, and family updates — recovery without the hospital bill.',
        highlights: [
          'Personalized recovery plan',
          'Day-by-day nurse & physio visits',
          'Family progress dashboard',
        ],
        to: '/register#post-care',
      },
      {
        id: 'prepare-reassure',
        imageSrc: subserviceImageSrc('prepare-reassure'),
        laymanName: 'Prepare & Reassure',
        tagline: 'Everything in place before you step into a hospital',
        legacyName: 'Pre Hospital Care',
        description:
          'Pre-admission coordination — paperwork, fasting plans, transport, and a familiar caregiver at admission so nothing is rushed or forgotten.',
        highlights: [
          'Admission paperwork support',
          'Pre-op coaching & checklist',
          'Door-to-bed transport',
        ],
        to: '/register#lifeline-care',
      },
    ],
  },
  {
    id: 'healing-at-home',
    title: 'Healing at Home',
    formerName: 'Care & Treatment',
    tagline: 'Doctors, nurses, physio, medicines, and tests — all at your door.',
    Icon: Home,
    accent:
      'bg-gradient-to-br from-brand-500/20 to-violet-500/10 border-brand-500/30 text-brand-300',
    imageSrc: `${import.meta.env.BASE_URL}images/service-pillars/healing-at-home.jpg`,
    imageBorderColor: '#7dd3fc',
    services: [
      {
        id: 'healing-hands',
        imageSrc: subserviceImageSrc('healing-hands'),
        laymanName: 'Healing Hands',
        tagline: 'Compassionate nursing, brought to your door',
        legacyName: 'Nurses',
        serviceType: 'nurse_visit',
        description:
          'Licensed nurses for IV, injections, wound care, vitals, catheter care, and post-operative nursing — at home, on your schedule.',
        highlights: [
          'IV, injections & wound care',
          'Vitals & post-op monitoring',
          'Verified, background-checked nurses',
        ],
        to: '/register',
      },
      {
        id: 'doctor-at-door',
        imageSrc: subserviceImageSrc('doctor-at-door'),
        laymanName: 'Doctor at Your Door',
        tagline: 'Expert advice without leaving your home',
        legacyName: 'Doc on Call',
        serviceType: 'doctor_consult',
        description:
          'Speak with a licensed physician by video in minutes or book a home consultation for in-person care — ideal for seniors and homebound patients.',
        highlights: [
          'Video consult under 8 minutes',
          'Home visit option',
          'Senior priority queue',
        ],
        to: '/register',
      },
      {
        id: 'carescript',
        imageSrc: subserviceImageSrc('carescript'),
        laymanName: 'CareScript',
        tagline: 'Your prescriptions, delivered with care',
        legacyName: 'Medicine',
        description:
          'Prescription fulfilment with verified pharmacies, refill reminders, and home delivery — including chronic and senior-care medication packs.',
        highlights: [
          'Verified pharmacy network',
          'Refill reminders & auto-orders',
          'Doorstep delivery',
        ],
        to: '/register#healing-at-home',
      },
      {
        id: 'move-mend',
        imageSrc: subserviceImageSrc('move-mend'),
        laymanName: 'Move & Mend',
        tagline: 'Gentle therapy to get you moving again',
        legacyName: 'Physio',
        serviceType: 'physiotherapy',
        description:
          'In-home physiotherapy for post-surgery mobility, chronic pain, and senior strength — with progress tracking and personalised rehab plans.',
        highlights: [
          'Personalised rehab plan',
          'Pain & mobility recovery',
          'Visit-by-visit progress notes',
        ],
        to: '/register',
      },
      {
        id: 'healthclarity',
        imageSrc: subserviceImageSrc('healthclarity'),
        laymanName: 'HealthClarity',
        tagline: 'Answers to what your body is telling you',
        legacyName: 'Diagnostic',
        description:
          'At-home sample collection for blood work, imaging coordination, and a clinician-reviewed summary — clear answers without the lab trip.',
        highlights: [
          'Home phlebotomy & sample pickup',
          'Imaging coordination',
          'Clinician-reviewed reports',
        ],
        to: '/register#healing-at-home',
      },
    ],
  },
  {
    id: 'thrive-well',
    title: 'Thrive Well',
    formerName: 'Wellness',
    tagline: 'Stay strong, eat right, and protect what matters — every day.',
    Icon: Flower2,
    accent:
      'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
    imageSrc: `${import.meta.env.BASE_URL}images/service-pillars/thrive-well.jpg`,
    imageBorderColor: '#6ee7b7',
    services: [
      {
        id: 'breathe-balance',
        imageSrc: subserviceImageSrc('breathe-balance'),
        laymanName: 'Breathe & Balance',
        tagline: 'Find stillness, strength, and peace within',
        legacyName: 'Yoga',
        description:
          'Certified yoga instructors guide sessions for stress, posture, prenatal care, and senior mobility — at home or live online.',
        highlights: [
          'Certified, vetted instructors',
          'Live online or in-home',
          'Programs for every age & goal',
        ],
        to: '/register#thrive-well',
      },
      {
        id: 'revive-restore',
        imageSrc: subserviceImageSrc('revive-restore'),
        laymanName: 'Revive & Restore',
        tagline: 'Active recovery for a life in full motion',
        legacyName: 'Physio',
        serviceType: 'physiotherapy',
        description:
          'Preventive and performance physiotherapy — sports recovery, posture correction, and mobility plans for healthy, active living.',
        highlights: [
          'Sports & posture recovery',
          'Mobility & strength plans',
          'Track progress over time',
        ],
        to: '/register',
      },
      {
        id: 'nourish-flourish',
        imageSrc: subserviceImageSrc('nourish-flourish'),
        laymanName: 'Nourish & Flourish',
        tagline: 'Food that loves your body back',
        legacyName: 'Dietician & Food',
        description:
          'Dietitian-planned meals and nutrition coaching — recovery trays, diabetic plans, and senior-friendly menus delivered to your door.',
        highlights: [
          'Dietitian-curated menus',
          'Diabetic & recovery plans',
          'Scheduled home delivery',
        ],
        to: '/register#thrive-well',
      },
      {
        id: 'wholeness-hub',
        imageSrc: subserviceImageSrc('wholeness-hub'),
        laymanName: 'Wholeness Hub',
        tagline: 'A place where every part of you is cared for',
        legacyName: 'Wellness Clinic',
        description:
          'Integrated wellness check-ins covering body, mind, and lifestyle — with care plans you can follow from home or at our clinic.',
        highlights: [
          'Holistic health assessment',
          'Mind, body & lifestyle plan',
          'Clinic or in-home follow-ups',
        ],
        to: '/register#thrive-well',
      },
      {
        id: 'stayahead-health',
        imageSrc: subserviceImageSrc('stayahead-health'),
        laymanName: 'StayAhead Health',
        tagline: 'Catch it early, live fully',
        legacyName: 'Preventive Checkup',
        description:
          'Annual preventive panels, screenings, and proactive monitoring tailored to age and risk — to catch issues before they become emergencies.',
        highlights: [
          'Age & risk-based screenings',
          'Annual health benchmark',
          'Clinician follow-up included',
        ],
        to: '/register#thrive-well',
      },
      {
        id: 'careshield',
        imageSrc: subserviceImageSrc('careshield'),
        laymanName: 'CareShield',
        tagline: 'Protection that holds you when life gets uncertain',
        legacyName: 'Insurance',
        description:
          'Health & care insurance navigation — claims help, cashless coordination at network hospitals, and guidance picking the right cover for your family.',
        highlights: [
          'Claims & cashless support',
          'Network hospital coordination',
          'Plan-fit guidance for your family',
        ],
        to: '/register#thrive-well',
      },
    ],
  },
];

/** Icons keyed by service id for nav menus & feature panels. */
export const SERVICE_ICONS = {
  'careguard-ai': Eye,
  'carebot-companion': Bot,
  'rapid-relief': HeartPulse,
  'bedside-companion': Building2,
  'homecoming-care': Home,
  'prepare-reassure': ClipboardCheck,
  'healing-hands': UserRound,
  'doctor-at-door': Stethoscope,
  carescript: Pill,
  'move-mend': Activity,
  healthclarity: FlaskConical,
  'breathe-balance': Flower2,
  'revive-restore': Activity,
  'nourish-flourish': Apple,
  'wholeness-hub': Building2,
  'stayahead-health': ClipboardCheck,
  careshield: Shield,
};

const CUSTOM_SECTION_ACCENTS = [
  'bg-gradient-to-br from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-300',
  'bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 border-fuchsia-500/30 text-fuchsia-300',
  'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
  'bg-gradient-to-br from-emerald-500/20 to-lime-500/10 border-emerald-500/30 text-emerald-300',
];

const normalizeId = (value, fallback) =>
  String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function normalizeMarketingSection(section, index = 0) {
  const sectionId = normalizeId(section?.id || section?.title, `custom-service-${index + 1}`);
  return {
    id: sectionId,
    title: section?.title || 'Custom Service',
    formerName: 'Admin created',
    tagline: section?.tagline || 'Care services added by the admin team.',
    Icon: Sparkles,
    accent: CUSTOM_SECTION_ACCENTS[index % CUSTOM_SECTION_ACCENTS.length],
    services: (section?.services || []).map((service, serviceIndex) => {
      const serviceId = normalizeId(service?.id || service?.laymanName, `${sectionId}-service-${serviceIndex + 1}`);
      return {
        id: serviceId,
        laymanName: service?.laymanName || service?.label || 'Sub-service',
        tagline: service?.tagline || service?.description || 'Book this service at home',
        legacyName:
          service?.rate != null
            ? new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(Number(service.rate || 0))
            : 'Admin service',
        description: service?.description || service?.tagline || '',
        rate: service?.rate,
        highlights: service?.description ? [service.description] : ['Admin-created service'],
        imageSrc:
          service?.imageUrl || service?.imageSrc || subserviceImageSrc(serviceId) || null,
        to: '/register',
      };
    }),
  };
}

export function mergeServiceSections(marketingSections = [], visibility = {}) {
  const hiddenDefaultSections = new Set(visibility.hiddenDefaultSections || []);
  const hiddenDefaultServices = visibility.hiddenDefaultServices || {};
  const defaultSectionImages = visibility.defaultSectionImages || {};
  const defaultServiceImages = visibility.defaultServiceImages || {};
  const merged = SERVICE_SECTIONS.filter((section) => !hiddenDefaultSections.has(section.id))
    .map((section) => ({
      ...section,
      imageSrc: defaultSectionImages[section.id] || section.imageSrc,
      services: section.services
        .filter((service) => !(hiddenDefaultServices[section.id] || []).includes(service.id))
        .map((service) => ({
          ...service,
          imageSrc:
            defaultServiceImages[section.id]?.[service.id] ||
            service.imageSrc ||
            subserviceImageSrc(service.id) ||
            null,
        })),
    }))
    .filter((section) => section.services.length > 0);
  normalizeMarketingSectionList(marketingSections).forEach((section) => {
    const existing = merged.find((item) => item.id === section.id || item.title.toLowerCase() === section.title.toLowerCase());
    if (existing) {
      existing.services = [...existing.services, ...section.services];
      return;
    }
    merged.push(section);
  });
  return merged;
}

export function normalizeMarketingSectionList(marketingSections = []) {
  return (Array.isArray(marketingSections) ? marketingSections : [])
    .map((section, index) => normalizeMarketingSection(section, index))
    .filter((section) => section.services.length > 0);
}

export const ALL_SERVICES = SERVICE_SECTIONS.flatMap((section) =>
  section.services.map((service) => ({
    ...service,
    sectionId: section.id,
    sectionTitle: section.title,
  }))
);

export function buildServiceLink(service) {
  if (service.serviceType) {
    return `/register?service=${service.serviceType}`;
  }
  return service.to || '/register';
}

export function getSectionById(id) {
  return SERVICE_SECTIONS.find((s) => s.id === id);
}
