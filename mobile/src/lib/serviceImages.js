/** Pillar + sub-service images — mirrors web `serviceSections.js` / marketing assets. */

export const PILLAR_IMAGES = {
  'smart-care': require('../../assets/pillars/smart-care.jpg'),
  'lifeline-care': require('../../assets/pillars/lifeline-care.jpg'),
  'healing-at-home': require('../../assets/pillars/healing-at-home.jpg'),
  'thrive-well': require('../../assets/pillars/thrive-well.jpg'),
};

export const PILLAR_BORDER_COLOR = '#000000';

/** @deprecated Use PILLAR_BORDER_COLOR — kept for call sites keyed by pillar id. */
export const PILLAR_BORDER_COLORS = {
  'smart-care': PILLAR_BORDER_COLOR,
  'lifeline-care': PILLAR_BORDER_COLOR,
  'healing-at-home': PILLAR_BORDER_COLOR,
  'thrive-well': PILLAR_BORDER_COLOR,
};

/** Sub-service hero images (same files as web `/images/service-subservices/`). */
export const SUBSERVICE_IMAGES = {
  'careguard-ai': require('../../assets/subservices/careguard ai.jpg'),
  'carebot-companion': require('../../assets/subservices/carebot-companion.jpg'),
  'rapid-relief': require('../../assets/subservices/Rapid relief.jpg'),
  'bedside-companion': require('../../assets/subservices/Bedside companion.jpg'),
  'homecoming-care': require('../../assets/subservices/Homecoming.jpg'),
  'prepare-reassure': require('../../assets/subservices/Prepare and reassure.jpg'),
  'healing-hands': require('../../assets/subservices/Healing hands.jpg'),
  'doctor-at-door': require('../../assets/subservices/Doctor on call.jpg'),
  carescript: require('../../assets/subservices/Carescript medicine.jpg'),
  'move-mend': require('../../assets/subservices/Move and mend.jpg'),
  healthclarity: require('../../assets/subservices/Healthclarity diagnostic.jpg'),
  'breathe-balance': require('../../assets/subservices/Breath and balance.jpg'),
  'revive-restore': require('../../assets/subservices/Revive and restore.jpg'),
  'nourish-flourish': require('../../assets/subservices/Nourish and flourish.jpg'),
  'wholeness-hub': require('../../assets/subservices/Wholeness hub.jpg'),
  'stayahead-health': require('../../assets/subservices/stayahead health.jpg'),
  careshield: require('../../assets/subservices/careshield.jpg'),
};

export function getPillarImage(pillarId) {
  return PILLAR_IMAGES[pillarId] || null;
}

export function getSubserviceImage(serviceId) {
  return SUBSERVICE_IMAGES[serviceId] || null;
}
