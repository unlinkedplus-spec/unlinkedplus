import type { AvatarConfig } from '../lib/api';
export const characters = [
  { id: 'panda', name: 'Karyawan Kantung Mata Panda', short: 'Si paling lembur' },
  { id: 'intern', name: 'Anak Magang Polos', short: 'Masih penuh harapan' },
  { id: 'php-victim', name: 'Korban PHP HRD', short: 'Menunggu kabar baik' },
  { id: 'freelancer', name: 'Freelancer Kurang Tidur', short: 'Revisi terakhir, katanya' },
];
export const accessorySlugs = ['id-card', 'kardus', 'kopi', 'bendera', 'kacamata'];
function Body({ skin, shirt }: { skin: string; shirt: string }) {
  return <><rect x="135" y="170" width="30" height="25" fill={skin}/><polygon points="108,192 192,192 207,292 93,292" fill={shirt}/><rect x="74" y="192" width="30" height="82" rx="14" fill={shirt} transform="rotate(-8 89 192)"/><rect x="196" y="192" width="30" height="82" rx="14" fill={shirt} transform="rotate(8 211 192)"/><rect x="105" y="285" width="36" height="42" rx="10" fill="#374151"/><rect x="159" y="285" width="36" height="42" rx="10" fill="#374151"/></>;
}
function Eyes({ intern = false }: { intern?: boolean }) {
  return <>{[127, 173].map(x => <g key={x}><circle cx={x} cy="117" r={intern ? 11 : 9} fill="white"/><circle cx={x + (intern ? 0 : 2)} cy="118" r="5" fill="#1A1A1A"/><circle cx={x + (intern ? 2 : 4)} cy="115" r="2" fill="white"/><rect x={x - 9} y={intern ? 102 : 104} width="18" height={intern ? 3 : 4} rx="2" fill={intern ? '#4A3728' : '#2D2D2D'}/></g>)}</>;
}
function Character({ name }: { name: string }) {
  if (name === 'intern') return <><Body skin="#FFE0B2" shirt="#93C5FD"/><circle cx="150" cy="115" r="65" fill="#FFE0B2"/><rect x="100" y="58" width="100" height="40" rx="20" fill="#4A3728"/><Eyes intern/><path d="M135,138 Q150,150 165,138" fill="none" stroke="#C0845C" strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="113" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/><ellipse cx="187" cy="132" rx="10" ry="6" fill="#FFB7B2" opacity="0.5"/></>;
  if (name === 'php-victim') return <><Body skin="#FDDCB0" shirt="#374151"/><circle cx="150" cy="115" r="65" fill="#FDDCB0"/><path d="M87,105 Q95,55 150,52 Q200,55 212,100 L208,85 Q200,60 170,58 Q155,45 140,55 Q110,58 95,80 Z" fill="#5C4033"/><path d="M200,80 Q215,60 205,45 Q198,65 190,72 M185,65 Q195,42 180,30 Q178,52 173,62" stroke="#5C4033" strokeWidth="3" fill="none"/><path d="M115,105 Q127,100 135,106 M165,106 Q173,100 185,105" stroke="#5C4033" strokeWidth="3" fill="none" strokeLinecap="round"/>{[127,173].map(x => <g key={x}><circle cx={x} cy="117" r="8" fill="white"/><circle cx={x} cy="118" r="4" fill="#1A1A1A"/><ellipse cx={x} cy="123" rx="10" ry="5" fill="#C0A090" opacity="0.4"/></g>)}<path d="M137,142 Q150,138 163,142" fill="none" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/><path d="M136,170 L150,185 L164,170" fill="none" stroke="#FDDCB0" strokeWidth="3"/></>;
  if (name === 'freelancer') return <><Body skin="#FFE0B2" shirt="#6B7280"/><circle cx="150" cy="115" r="65" fill="#FFE0B2"/><path d="M85,115 Q82,65 110,52 Q130,38 150,45 Q170,38 190,52 Q218,65 215,110 Q205,70 185,62 Q165,52 150,55 Q135,52 115,62 Q95,70 85,115 Q80,100 85,115Z" fill="#2D2D2D"/><path d="M82,160 Q78,110 90,80 Q70,100 68,150 Q70,185 90,195 L108,192 Q90,180 82,160Z M218,160 Q222,110 210,80 Q230,100 232,150 Q230,185 210,195 L192,192 Q210,180 218,160Z" fill="#5a6372"/>{[127,173].map(x => <g key={x}><ellipse cx={x} cy="120" rx="20" ry="11" fill="#1A1A1A" opacity="0.42"/><rect x={x-9} y="113" width="18" height="9" rx="4" fill="white"/><circle cx={x} cy="117" r="4" fill="#1A1A1A"/><rect x={x-9} y="104" width="18" height="3" rx="1.5" fill="#2D2D2D"/></g>)}<path d="M138,140 Q150,145 162,140" fill="none" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/><rect x="108" y="250" width="84" height="52" rx="6" fill="#172B4D" opacity="0.7"/><rect x="112" y="254" width="76" height="42" rx="3" fill="#60a5fa" opacity="0.5"/></>;
  return <><Body skin="#FDDCB0" shirt="#2D4080"/><circle cx="150" cy="115" r="65" fill="#FDDCB0"/><path d="M90,100 Q100,55 150,50 Q200,55 210,100 Q195,70 150,65 Q105,70 90,100" fill="#2D2D2D"/><ellipse cx="127" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/><ellipse cx="173" cy="120" rx="17" ry="9" fill="#1A1A1A" opacity="0.32"/><Eyes/><path d="M136,140 Q150,148 164,140" fill="none" stroke="#5C4033" strokeWidth="2.5" strokeLinecap="round"/><polygon points="150,170 144,180 150,195 156,180" fill="#EF4444"/></>;
}
function Accessory({ name }: { name: string }) {
  switch (name) {
    case 'id-card': return <g><polyline points="150,165 142,188 158,188" fill="none" stroke="#9CA3AF" strokeWidth="2"/><g transform="rotate(12,150,203)"><rect x="129" y="188" width="42" height="30" rx="4" fill="white" stroke="#172B4D" strokeWidth="2"/><line x1="135" y1="198" x2="165" y2="198" stroke="#9CA3AF" strokeWidth="1.5"/><line x1="135" y1="206" x2="158" y2="206" stroke="#9CA3AF"/><rect x="133" y="190" width="10" height="8" rx="2" fill="#60A5FA"/></g></g>;
    case 'kardus': return <g><rect x="170" y="210" width="58" height="48" rx="4" fill="#B08040" stroke="#8B6914" strokeWidth="2"/><path d="M170,228 L228,228 M199,210 L199,222" stroke="#8B6914" strokeWidth="1.5"/><rect x="176" y="214" width="18" height="12" rx="2" fill="#60A5FA"/><rect x="198" y="216" width="14" height="8" rx="2" fill="#FCD34D"/><path d="M170,210 Q199,202 228,210" fill="#C69040" stroke="#8B6914" strokeWidth="1.5"/></g>;
    case 'kopi': return <g><polygon points="78,192 100,192 95,250 83,250" fill="#D2691E"/><rect x="75" y="186" width="28" height="10" rx="5" fill="white" stroke="#D2691E" strokeWidth="1.5"/><line x1="88" y1="186" x2="84" y2="165" stroke="#9CA3AF" strokeWidth="2"/><circle cx="84" cy="163" r="3" fill="#374151"/><text x="89" y="228" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">XXL</text></g>;
    case 'bendera': return <g><line x1="232" y1="152" x2="232" y2="238" stroke="#8B6914" strokeWidth="3"/><path d="M232,152 L266,164 L232,178Z" fill="white" stroke="#9CA3AF" strokeWidth="1.5"/></g>;
    case 'kacamata': return <g transform="rotate(5,150,118)" stroke="#1A1A1A" fill="none"><circle cx="127" cy="118" r="18" strokeWidth="3"/><circle cx="173" cy="118" r="18" strokeWidth="3"/><path d="M145 119h10M109 116l-14 4m96-4 14 4" strokeWidth="2"/></g>;
    default: return null;
  }
}
// Only the fixed, locally authored presets above become SVG. Server text is never markup.
export function Avatar({ config, className = '', label = 'Avatar' }: { config?: AvatarConfig | null; className?: string; label?: string }) {
  const character = characters.some(c => c.id === config?.character) ? config!.character : 'panda';
  const accessories = Array.isArray(config?.accessories) ? accessorySlugs.filter(slug => config.accessories.includes(slug)) : [];
  return <svg className={`avatar-art ${className}`} viewBox="0 0 300 300" role="img" aria-label={label}><Character name={character}/>{accessories.map(name => <Accessory key={name} name={name}/>)}</svg>;
}
