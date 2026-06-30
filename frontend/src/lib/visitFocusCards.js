/** How many suggestion cards to show on the booking dashboard row. */
export const VISIT_FOCUS_PREVIEW_COUNT = 4;

/**
 * Map an admin care-service option to SeasonalHoverCards props.
 * @param {object} opt
 * @param {string} priceLabel — formatted price, e.g. "₹399"
 */
export function careOptionToSeasonCard(opt, priceLabel) {
  return {
    id: opt.id,
    serviceType: opt.serviceType,
    title: opt.label,
    subtitle: priceLabel,
    description: opt.description?.trim() || 'Select this service for your visit.',
    imageSrc: opt.imageUrl || '',
    imageAlt: opt.label,
  };
}
