// Original vector art: character portraits, creatures, explorers, boats.
import { motion } from 'framer-motion';

export { Portrait } from './Portraits';

/* ---- board pieces (drawn centred at 0,0, ~hex size 40) ---- */
export function ExplorerPawn({ color, value, selected, own }: { color: string; value: number | null; selected?: boolean; own?: boolean }) {
  return (
    <g>
      {selected && <circle r="13" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="4 3"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" /></circle>}
      <ellipse cx="1.5" cy="10" rx="9.5" ry="3.2" fill="#0007" />
      {/* wooden-meeple style adventurer: round base, body, head, side shading */}
      <ellipse cx="0" cy="8.5" rx="8.5" ry="3.2" fill={color} stroke="#1118" strokeWidth="1.2" />
      <ellipse cx="0" cy="8.5" rx="8.5" ry="3.2" fill="#000" opacity=".3" />
      <path d="M-7 8 C-7.5 1 -4.5 -2 0 -2 C4.5 -2 7.5 1 7 8 Z" fill={color} stroke="#1118" strokeWidth="1.2" />
      <circle cx="0" cy="-6.5" r="5.4" fill={color} stroke="#1118" strokeWidth="1.2" />
      <path d="M-7 8 C-7.5 1 -4.5 -2 0 -2 C4.5 -2 7.5 1 7 8 Z" fill="url(#pawnShade)" />
      <circle cx="0" cy="-6.5" r="5.4" fill="url(#pawnShade)" />
      <ellipse cx="-2" cy="-8.6" rx="1.9" ry="1.3" fill="#fff" opacity=".7" />
      <path d="M-4.5 2 Q-5 5 -4.6 7" stroke="#fff" strokeOpacity=".45" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {own && <ellipse cx="0" cy="8.5" rx="10.5" ry="4" fill="none" stroke="#fff" strokeWidth="1.2" strokeOpacity=".8" />}
      {value != null && (
        <g transform="translate(7.5,-10)">
          <circle r="5.8" fill="#7a4a12" />
          <circle r="5.2" fill={own ? '#fde68a' : '#f5f5f4'} stroke="#92400e" strokeWidth="1" />
          <circle r="3.8" fill="none" stroke="#b45309" strokeOpacity=".45" strokeWidth=".8" />
          <text textAnchor="middle" dy="3" fontSize="8" fontWeight="900" fill="#3b1d00">{value}</text>
        </g>
      )}
    </g>
  );
}
export function BoatSprite({ selected }: { selected?: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="9" rx="27" ry="6" fill="#e0f7ff" opacity=".3" />
      <ellipse cx="2" cy="9" rx="24" ry="4.5" fill="#00203a" opacity=".45" />
      {selected && <path d="M-26 -1 Q-24 12 0 13 Q24 12 26 -1 Q0 -7 -26 -1 Z" fill="none" stroke="#ffe08a" strokeWidth="5" opacity=".9" />}
      {/* wooden rowing boat seen from above-front */}
      <path d="M-25 -1 Q-23 11 0 12 Q23 11 25 -1 Q0 -6 -25 -1 Z" fill="#6e3f17" stroke="#2b1608" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-21 0 Q-19 8 0 9 Q19 8 21 0 Q0 -3.5 -21 0 Z" fill="#b8793c" />
      <path d="M-19 3 Q0 6 19 3 M-17 6 Q0 8.5 17 6" stroke="#8a5424" strokeWidth=".9" fill="none" />
      <rect x="-12" y="-1.5" width="3" height="9" rx="1" fill="#7a4a1e" />
      <rect x="9" y="-1.5" width="3" height="9" rx="1" fill="#7a4a1e" />
      <path d="M-25 -1 Q0 -6 25 -1" stroke="#e2a867" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M-24 2 Q-23 9 -10 11" stroke="#00000040" strokeWidth="1" fill="none" />
    </g>
  );
}
import { KaijuSprite, KrakenSprite, PteroSprite, SerpentSprite, SharkSprite, WhaleSprite } from './Creatures';
export { KaijuSprite, KrakenSprite, PteroSprite, SerpentSprite, SharkSprite, WhaleSprite };
export function EggSprite() {
  return (
    <g>
      <ellipse cx="0" cy="8" rx="9" ry="2.5" fill="#0005" />
      <g className="anim-bob-slow">
        <ellipse cx="0" cy="-2" rx="8" ry="10.5" fill="#fef3c7" stroke="#78350f" strokeWidth="1.5" />
        <circle cx="-3" cy="-5" r="1.8" fill="#a3e635" /><circle cx="3" cy="1" r="2.2" fill="#38bdf8" /><circle cx="2" cy="-8" r="1.3" fill="#f87171" />
        <path d="M-4 3 l2 -2 l2 2 l2 -2" stroke="#78350f" strokeWidth="1" fill="none">
          <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
        </path>
      </g>
    </g>
  );
}
export function PiranhaSprite({ x = 0, y = 0, flip = false }: { x?: number; y?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`}>
      <path d="M-7 0 Q0 -7 7 0 Q0 7 -7 0 Z" fill="#ef4444" stroke="#450a0a" strokeWidth="1" />
      <path d="M-7 0 L-11 -4 L-11 4 Z" fill="#b91c1c" />
      <path d="M3 1 l1.5 1.5 l1.5 -1.5" stroke="#fff" strokeWidth="0.9" fill="none" />
      <circle cx="3" cy="-2" r="1" fill="#111" />
    </g>
  );
}
export const CreatureSprite = ({ kind }: { kind: string }) =>
  kind === 'shark' ? <SharkSprite /> : kind === 'whale' ? <WhaleSprite /> : kind === 'serpent' ? <SerpentSprite />
    : kind === 'kraken' ? <KrakenSprite /> : kind === 'ptero' ? <PteroSprite /> : <KaijuSprite />;

export const CREATURE_LABEL: Record<string, string> = { shark: 'Shark', whale: 'Whale', serpent: 'Sea Serpent', kaiju: 'Kaiju', kraken: 'Kraken', ptero: 'Pterodactyl' };
export const CREATURE_ICON: Record<string, string> = { shark: '🦈', whale: '🐋', serpent: '🐉', kaiju: '🦖', kraken: '🐙', ptero: '🦅' };
export const CREATURE_INFO: Record<string, string> = {
  serpent: 'Red · moves 1 water space · eliminates rafts and every adventurer on its space.',
  kraken: 'Red · moves 1 water space · eats swimmers, then grabs one adventurer on or next to its space.',
  shark: 'Green · moves 1–2 water spaces · eats swimmers.',
  ptero: 'Green · flies any distance in a straight line · snatches a lone adventurer (land or sea).',
  kaiju: 'Blue · moves 1–2 water or land spaces · smashes rafts, shoves adventurers and creatures aside.',
  whale: 'Blue · moves 1–3 water spaces · smashes rafts (the crew start swimming).',
};
export const DIE_COLOR: Record<string, string> = { red: '#dc2626', green: '#16a34a', blue: '#2563eb' };
export const ABILITY_LABEL: Record<string, string> = { paddles: 'Paddles', dolphin: 'Dolphin', dive: 'Dive', die: 'Creature Die', repellent: 'Repellent', piranha: 'Piranhas' };
export const ABILITY_ICON: Record<string, string> = { paddles: '🛶', dolphin: '🐬', dive: '🌊', die: '🎲', repellent: '🧴', piranha: '🐟' };
export const ABILITY_HELP: Record<string, string> = {
  paddles: 'Move an empty raft, or one you control, 1 or 2 spaces.',
  dolphin: 'Move one of your swimmers 1 or 2 water spaces — it may end on land or on a raft.',
  dive: 'Move any creature to any empty water space.',
  die: 'Roll the creature die and move a creature of that colour.',
  repellent: 'Played automatically: removes a Shark or Kaiju that reaches your adventurer.',
  piranha: 'Place a piranha tile on a water space next to another piranha tile.',
};
export const EFFECT_LABEL: Record<string, [string, string]> = {
  green: ['🟢', 'Green creature'], blue: ['🔵', 'Blue creature'], raft: ['🛶', 'Raft'], whirlpool: ['🌀', 'Whirlpool'], volcano: ['🌋', 'Volcano'],
  piranha: ['🐟', 'Piranhas'], egg: ['🥚', 'Egg'], paddles: ['🛶', 'Paddles'], dolphin: ['🐬', 'Dolphin'], dive: ['🌊', 'Dive'], die: ['🎲', 'Creature die'],
  repellent: ['🧴', 'Repellent'], secret: ['❔', 'Secret ability'],
};
