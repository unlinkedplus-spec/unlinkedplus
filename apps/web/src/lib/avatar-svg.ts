/**
 * SVG constants ported from js/avatar-builder.js.
 * ViewBox: 0 0 300 300. Head center: (150,115). Body polygon: 110,195 190,195 205,290 95,290.
 */
import type { AccessoryId, AvatarConfig, CharacterId } from './types';

function bodyParts(skinColor: string, shirtColor: string): string {
  return (
    `<rect x="135" y="170" width="30" height="25" fill="${skinColor}"/>` +
    `<polygon points="108,192 192,192 207,292 93,292" fill="${shirtColor}"/>` +
    `<rect x="74" y="192" width="30" height="82" rx="14" fill="${shirtColor}" transform="rotate(-8 89 192)"/>` +
    `<rect x="196" y="192" width="30" height="82" rx="14" fill="${shirtColor}" transform="rotate(8 211 192)"/>` +
    `<rect x="105" y="285" width="36" height="42" rx="10" fill="#374151"/>` +
    `<rect x="159" y="285" width="36" height="42" rx="10" fill="#374151"/>`
  );
}

export const CHARACTER_SVG: Record<CharacterId, string> = {
  panda:
    bodyParts('#FDDCB0', '#2D4080') +
    '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/>' +
    '<path d="M90,100 Q100,55 150,50 Q200,55 210,100 Q195,70 150,65 Q105,70 90,100" fill="#2D2D2D"/>' +
    '<ellipse cx="127" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/>' +
    '<ellipse cx="173" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/>' +
    '<circle cx="127" cy="117" r="9" fill="white"/>' +
    '<circle cx="173" cy="117" r="9" fill="white"/>' +
    '<circle cx="129" cy="118" r="5" fill="#1A1A1A"/>' +
    '<circle cx="175" cy="118" r="5" fill="#1A1A1A"/>' +
    '<circle cx="131" cy="115" r="2" fill="white"/>' +
    '<circle cx="177" cy="115" r="2" fill="white"/>' +
    '<rect x="118" y="104" width="18" height="4" rx="2" fill="#2D2D2D"/>' +
    '<rect x="163" y="104" width="18" height="4" rx="2" fill="#2D2D2D"/>' +
    '<path d="M136,140 Q150,148 164,140" fill="none" stroke="#5C4033" stroke-width="2.5" stroke-linecap="round"/>' +
    '<polygon points="150,170 144,180 150,195 156,180" fill="#EF4444"/>',

  intern:
    bodyParts('#FFE0B2', '#93C5FD') +
    '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/>' +
    '<rect x="100" y="58" width="100" height="40" rx="20" fill="#4A3728"/>' +
    '<circle cx="127" cy="117" r="11" fill="white"/>' +
    '<circle cx="173" cy="117" r="11" fill="white"/>' +
    '<circle cx="127" cy="118" r="5" fill="#1A1A1A"/>' +
    '<circle cx="173" cy="118" r="5" fill="#1A1A1A"/>' +
    '<circle cx="129" cy="115" r="2" fill="white"/>' +
    '<circle cx="175" cy="115" r="2" fill="white"/>' +
    '<rect x="119" y="102" width="16" height="3" rx="1.5" fill="#4A3728"/>' +
    '<rect x="165" y="102" width="16" height="3" rx="1.5" fill="#4A3728"/>' +
    '<path d="M135,138 Q150,150 165,138" fill="none" stroke="#C0845C" stroke-width="2.5" stroke-linecap="round"/>' +
    '<ellipse cx="113" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/>' +
    '<ellipse cx="187" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/>',

  'php-victim':
    bodyParts('#FDDCB0', '#374151') +
    '<circle cx="150" cy="115" r="65" fill="#FDDCB0"/>' +
    '<path d="M87,105 Q95,55 150,52 Q200,55 212,100 L208,85 Q200,60 170,58 Q155,45 140,55 Q110,58 95,80 Z" fill="#5C4033"/>' +
    '<path d="M200,80 Q215,60 205,45 Q198,65 190,72 M185,65 Q195,42 180,30 Q178,52 173,62" stroke="#5C4033" stroke-width="3" fill="none"/>' +
    '<path d="M115,105 Q127,100 135,106" stroke="#5C4033" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M165,106 Q173,100 185,105" stroke="#5C4033" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="127" cy="117" r="8" fill="white"/>' +
    '<circle cx="173" cy="117" r="8" fill="white"/>' +
    '<circle cx="127" cy="118" r="4" fill="#1A1A1A"/>' +
    '<circle cx="173" cy="118" r="4" fill="#1A1A1A"/>' +
    '<ellipse cx="127" cy="123" rx="10" ry="5" fill="#C0A090" opacity="0.4"/>' +
    '<ellipse cx="173" cy="123" rx="10" ry="5" fill="#C0A090" opacity="0.4"/>' +
    '<path d="M137,142 Q150,138 163,142" fill="none" stroke="#5C4033" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M136,170 L150,185 L164,170" fill="none" stroke="#FDDCB0" stroke-width="3"/>',

  freelancer:
    bodyParts('#FFE0B2', '#6B7280') +
    '<circle cx="150" cy="115" r="65" fill="#FFE0B2"/>' +
    '<path d="M85,115 Q82,65 110,52 Q130,38 150,45 Q170,38 190,52 Q218,65 215,110 Q205,70 185,62 Q165,52 150,55 Q135,52 115,62 Q95,70 85,115 Q80,100 85,115Z" fill="#2D2D2D"/>' +
    '<path d="M82,160 Q78,110 90,80 Q70,100 68,150 Q70,185 90,195 L108,192 Q90,180 82,160Z" fill="#5a6372"/>' +
    '<path d="M218,160 Q222,110 210,80 Q230,100 232,150 Q230,185 210,195 L192,192 Q210,180 218,160Z" fill="#5a6372"/>' +
    '<ellipse cx="127" cy="120" rx="20" ry="11" fill="#1A1A1A" opacity="0.42"/>' +
    '<ellipse cx="173" cy="120" rx="20" ry="11" fill="#1A1A1A" opacity="0.42"/>' +
    '<rect x="118" y="113" width="18" height="9" rx="4" fill="white"/>' +
    '<rect x="164" y="113" width="18" height="9" rx="4" fill="white"/>' +
    '<circle cx="127" cy="117" r="4" fill="#1A1A1A"/>' +
    '<circle cx="173" cy="117" r="4" fill="#1A1A1A"/>' +
    '<rect x="118" y="104" width="18" height="3" rx="1.5" fill="#2D2D2D"/>' +
    '<rect x="164" y="104" width="18" height="3" rx="1.5" fill="#2D2D2D"/>' +
    '<path d="M138,140 Q150,145 162,140" fill="none" stroke="#5C4033" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="108" y="250" width="84" height="52" rx="6" fill="#172B4D" opacity="0.7"/>' +
    '<rect x="112" y="254" width="76" height="42" rx="3" fill="#60a5fa" opacity="0.5"/>',
};

export const ACCESSORY_SVG: Record<AccessoryId, string> = {
  'id-card':
    '<g id="acc-id-card">' +
    '<polyline points="150,165 142,188 158,188" fill="none" stroke="#9CA3AF" stroke-width="2"/>' +
    '<rect x="129" y="188" width="42" height="30" rx="4" fill="white" stroke="#172B4D" stroke-width="2" transform="rotate(12,150,203)"/>' +
    '<line x1="135" y1="198" x2="165" y2="198" stroke="#9CA3AF" stroke-width="1.5" transform="rotate(12,150,203)"/>' +
    '<line x1="135" y1="206" x2="158" y2="206" stroke="#9CA3AF" stroke-width="1" transform="rotate(12,150,203)"/>' +
    '<rect x="133" y="190" width="10" height="8" rx="2" fill="#60A5FA" transform="rotate(12,150,203)"/>' +
    '</g>',

  kardus:
    '<g id="acc-kardus">' +
    '<rect x="170" y="210" width="58" height="48" rx="4" fill="#B08040" stroke="#8B6914" stroke-width="2"/>' +
    '<path d="M170,228 L228,228" stroke="#8B6914" stroke-width="1.5"/>' +
    '<path d="M199,210 L199,222" stroke="#8B6914" stroke-width="1.5"/>' +
    '<rect x="176" y="214" width="18" height="12" rx="2" fill="#60A5FA"/>' +
    '<rect x="198" y="216" width="14" height="8" rx="2" fill="#FCD34D"/>' +
    '<path d="M170,210 Q199,202 228,210" fill="#C69040" stroke="#8B6914" stroke-width="1.5"/>' +
    '</g>',

  kopi:
    '<g id="acc-kopi">' +
    '<polygon points="78,192 100,192 95,250 83,250" fill="#D2691E"/>' +
    '<rect x="75" y="186" width="28" height="10" rx="5" fill="white" stroke="#D2691E" stroke-width="1.5"/>' +
    '<line x1="88" y1="186" x2="84" y2="165" stroke="#9CA3AF" stroke-width="2"/>' +
    '<circle cx="84" cy="163" r="3" fill="#374151"/>' +
    '<text x="89" y="228" text-anchor="middle" font-size="7" fill="white" font-weight="bold">XXL</text>' +
    '</g>',

  bendera:
    '<g id="acc-bendera">' +
    '<line x1="232" y1="152" x2="232" y2="238" stroke="#8B6914" stroke-width="3"/>' +
    '<path d="M232,152 L266,164 L232,178Z" fill="white" stroke="#9CA3AF" stroke-width="1.5"/>' +
    '</g>',

  kacamata:
    '<g id="acc-kacamata" transform="rotate(5,150,118)">' +
    '<circle cx="127" cy="118" r="18" fill="none" stroke="#1A1A1A" stroke-width="3"/>' +
    '<circle cx="173" cy="118" r="18" fill="none" stroke="#1A1A1A" stroke-width="3"/>' +
    '<line x1="145" y1="119" x2="155" y2="119" stroke="#1A1A1A" stroke-width="2"/>' +
    '<line x1="109" y1="116" x2="95" y2="120" stroke="#1A1A1A" stroke-width="2"/>' +
    '<line x1="191" y1="116" x2="205" y2="120" stroke="#1A1A1A" stroke-width="2"/>' +
    '</g>',
};

export const CHARACTER_LABELS: Record<CharacterId, string> = {
  panda: 'Kantung Mata Panda',
  intern: 'Anak Magang Polos',
  'php-victim': 'Korban PHP HRD',
  freelancer: 'Freelancer Kurang Tidur',
};

export const ACCESSORY_LABELS: Record<AccessoryId, string> = {
  'id-card': 'ID Card Miring',
  kardus: 'Kardus Barang',
  kopi: 'Kopi Galon',
  bendera: 'Bendera Putih',
  kacamata: 'Kacamata Melorot',
};

export const PREMIUM_ACCESSORIES: AccessoryId[] = ['kacamata'];

export function buildAvatarSVG(config: AvatarConfig | null | undefined): string {
  const character: CharacterId = config?.character ?? 'panda';
  const accessories: AccessoryId[] = config?.accessories ?? [];
  let content = CHARACTER_SVG[character] ?? CHARACTER_SVG.panda;
  for (const acc of accessories) {
    if (ACCESSORY_SVG[acc]) content += ACCESSORY_SVG[acc];
  }
  return content;
}
