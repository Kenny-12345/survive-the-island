// Playable avatars (original designs). They are cosmetic expedition leaders — they do NOT change the
// rules in Classic mode. The sea creatures on the board (shark, whale, serpent, kaiju) are environmental
// threats controlled through the creature die, never by a player as "their character".
export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  base: string; // main colour
  accent: string;
  aura: string; // FX colour
  fx: 'fire' | 'ice' | 'electric' | 'bubbles' | 'leaves' | 'sparks' | 'void' | 'ripples';
}
export const CHARACTERS: Character[] = [
  { id: 'gojirex', name: 'Gojirex', title: 'Atomic Kaiju', description: 'A towering lizard-king with glowing dorsal plates who leads expeditions with thunderous confidence.', base: '#3f6b4a', accent: '#a7f3d0', aura: '#38bdf8', fx: 'electric' },
  { id: 'megafin', name: 'Megafin', title: 'Giant Shark', description: 'A grinning mega-shark captain who knows every current around the island.', base: '#64748b', accent: '#e2e8f0', aura: '#60a5fa', fx: 'bubbles' },
  { id: 'coilvra', name: 'Coilvra', title: 'Sea Serpent', description: 'A wise, emerald serpent who navigates by starlight.', base: '#0f766e', accent: '#fde68a', aura: '#2dd4bf', fx: 'ripples' },
  { id: 'pyrovern', name: 'Pyrovern', title: 'Fire Dragon', description: 'A volcanic dragon who is suspiciously calm about eruptions.', base: '#b91c1c', accent: '#fbbf24', aura: '#f97316', fx: 'fire' },
  { id: 'kongaru', name: 'Kongaru', title: 'Giant Gorilla', description: 'A jungle titan with a gentle heart and an enormous rowing stroke.', base: '#57534e', accent: '#d6b38a', aura: '#84cc16', fx: 'leaves' },
  { id: 'frostmaw', name: 'Frostmaw', title: 'Ice Monster', description: 'A shaggy glacier beast who keeps everyone cool under pressure.', base: '#7dd3fc', accent: '#f0f9ff', aura: '#bae6fd', fx: 'ice' },
  { id: 'mechatron', name: 'Mechatron', title: 'Mechanical Monster', description: 'A brass-and-steel automaton with a built-in rescue winch.', base: '#78716c', accent: '#facc15', aura: '#fde047', fx: 'sparks' },
  { id: 'xenoid', name: 'Xenoid', title: 'Alien Monster', description: 'A three-eyed visitor who just wanted a beach holiday.', base: '#7c3aed', accent: '#a3e635', aura: '#c084fc', fx: 'void' },
];
export const CHARACTER_IDS = CHARACTERS.map(c => c.id);
export const charById = (id: string) => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
