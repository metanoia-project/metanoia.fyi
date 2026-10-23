import { SLOTS } from './avatar.js';

export function packTraits(traits) {
  const on = SLOTS.map((slot) => traits[slot.id] != null);
  const color = SLOTS.map((slot) => {
    const hex = String(traits[slot.id] || '#000000').replace('#', '');
    return `0x${hex.toLowerCase()}`;
  });
  return { on, color };
}
