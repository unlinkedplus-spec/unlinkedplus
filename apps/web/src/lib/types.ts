export interface Profile {
  userId: string;
  avatarConfig: AvatarConfig | null;
  mentalLevel: number;
  mentalXp: number;
  bio: string | null;
  isAnonymous: boolean;
}

export interface AvatarConfig {
  character: CharacterId;
  accessories: AccessoryId[];
}

export type CharacterId = 'panda' | 'intern' | 'php-victim' | 'freelancer';
export type AccessoryId = 'id-card' | 'kardus' | 'kopi' | 'bendera' | 'kacamata';

export interface User {
  id: string;
  username: string;
  createdAt: string;
  profile: Profile | null;
}

export interface ReactionCounts {
  pukpuk: number;
  ngakak: number;
  sama: number;
}

export interface Post {
  id: string;
  userId: string | null;
  category: string;
  content: string;
  createdAt: string;
  status: string;
  user: User | null;
  reactionCounts: ReactionCounts;
  _count?: { reactions: number; comments: number };
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  reactionType: string;
}

export interface AvatarItem {
  id: string;
  slug: string;
  name: string;
  itemType: string | null;
  price: number;
  isPremium: boolean;
}

export interface InventoryItem {
  userId: string;
  itemId: string;
  unlockedAt: string;
  item: AvatarItem;
}

export interface Transaction {
  id: string;
  userId: string | null;
  itemId: string | null;
  amount: number;
  paymentStatus: string;
  createdAt: string;
  mode: string;
  qrisPayload: string | null;
  realPayment: boolean;
  message: string;
}

export interface Certificate {
  id: string;
  status: string;
  createdAt: string;
  downloadUrl: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
}

export interface UserStats {
  totalPosts: number;
  totalReactionsReceived: number;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Rapuh',
  2: 'Tahan Banting',
  3: 'Kebal Revisi',
  4: 'Kebal PHP HRD',
  5: 'Suhu Spill',
};

export const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 50 },
  { level: 3, minXp: 150 },
  { level: 4, minXp: 300 },
  { level: 5, minXp: 500 },
];

export function getLevelName(level: number): string {
  return LEVEL_NAMES[level] ?? 'Rapuh';
}

export function getXpProgress(xp: number): { current: number; next: number; pct: number } {
  const thresholds = LEVEL_THRESHOLDS;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i].minXp) {
      const current = thresholds[i].minXp;
      const next = thresholds[i + 1]?.minXp ?? thresholds[i].minXp + 1;
      const pct = i === thresholds.length - 1 ? 100 : Math.round(((xp - current) / (next - current)) * 100);
      return { current, next, pct };
    }
  }
  return { current: 0, next: 50, pct: 0 };
}

export const POST_CATEGORIES = [
  'Ditolak HRD',
  'Salah Kirim Chat',
  'Dimarahi Bos',
  'Bisnis Boncos',
  'Salah Jurusan',
] as const;

export const ANTI_FLEX_PHRASES = [
  'alhamdulillah diterima', 'gaji dua digit', 'promosi jabatan',
  'bangga mengumumkan', 'humbled and honored', 'excited to announce',
  'thrilled to share', 'bersyukur diterima', 'naik jabatan', 'diterima kerja',
];

export function containsFlex(text: string): boolean {
  const lower = text.toLowerCase();
  return ANTI_FLEX_PHRASES.some((p) => lower.includes(p));
}
