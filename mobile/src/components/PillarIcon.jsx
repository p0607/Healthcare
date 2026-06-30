/** Maps a catalog pillar `iconKey` to an Ionicons glyph. */
import { Ionicons } from '@expo/vector-icons';

const ICON_BY_KEY = {
  sparkles: 'sparkles',
  pulse: 'pulse',
  home: 'home',
  flower: 'flower',
};

export default function PillarIcon({ iconKey, size = 22, color }) {
  const name = ICON_BY_KEY[iconKey] || 'medkit';
  return <Ionicons name={name} size={size} color={color} />;
}
