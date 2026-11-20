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
  role?: string;
  profile: Profile | null;
}

export interface ReactionCounts {
  pukpuk: number;
  ngakak: number;
  sama: number;
}

// Public authors are pseudonymous: no internal user id is ever sent with a
// post or comment (see PUBLIC_AUTHOR_SELECT in the API).
export type PostAuthor = Omit<User, 'id' | 'role'>;

export interface Post {
  id: string;
  category: string;
  content: string;
  createdAt: string;
  status: string;
  isAnonymous?: boolean;
  user: PostAuthor | null;
  reactionCounts: ReactionCounts;
  /** Spill Without Judgment: how the author wants readers to respond. */
  spillMode?: SpillMode;
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
  /** One-time recovery code. Store it somewhere safe; it cannot be retrieved later. */
  recoveryCode?: string;
}

export interface RecoveryResponse {
  success: boolean;
  emailSent?: boolean;
}

export interface AdminUser extends User {
  role: string;
  status: string;
}

export interface AdminPost {
  id: string;
  content: string;
  category: string;
  status: string;
  createdAt: string;
  userId: string | null;
  user: { id: string; username: string } | null;
}

export interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export interface AdminStats {
  users: number;
  activeUsers: number;
  posts: number;
  activePosts: number;
  comments: number;
  reports: number;
  pendingReports: number;
  paidTransactions: number;
  simulatedTransactions: number;
  /** Real money received via an official gateway. Always 0 while simulation-only. */
  revenue: number;
  /** Demo-only volume. Never presented as real income. */
  simulatedRevenue: number;
  activePolls: number;
  pendingCertificates: number;
}

export interface AdminOverview {
  stats: AdminStats;
  recent: {
    users: AdminUser[];
    posts: AdminPost[];
    reports: AdminReport[];
  };
  activity: { date: string; posts: number }[];
}

export interface UserStats {
  totalPosts: number;
  totalReactionsReceived: number;
}

/** SEC-04: user-owned ad settings, never inferred from Spill content. */
export interface AdPreferences {
  adsEnabled: boolean;
  maxPerSession: number;
}

export interface AdImpression {
  allowed: boolean;
  count: number;
  limit: number;
  reason: 'ok' | 'capped' | 'disabled';
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

export interface PollOptionResult {
  id: string;
  label: string;
  position: number;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  question: string;
  status: string;
  startsAt: string;
  endsAt: string;
  isOpen: boolean;
  totalVotes: number;
  myVoteId: string | null;
  options: PollOptionResult[];
}

export interface Confession {
  id: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    username: string;
    profile?: {
      avatarConfig?: unknown;
      mentalLevel?: number;
    };
  } | null;
  reactionCount: number;
  commentCount: number;
}

export const POST_CATEGORIES = [
  'Ditolak HRD',
  'Salah Kirim Chat',
  'Dimarahi Bos',
  'Bisnis Boncos',
  'Salah Jurusan',
] as const;

// Spill Without Judgment — the author, not the audience, decides the tone.
export const SPILL_MODES = ['listen', 'advice', 'laugh', 'share'] as const;
export type SpillMode = typeof SPILL_MODES[number];
export const SPILL_MODE_META: Record<SpillMode, { label: string; hint: string }> = {
  listen: { label: 'Cuma mau didengar', hint: 'Balas dengan dukungan, bukan nasihat.' },
  advice: { label: 'Butuh solusi', hint: 'Boleh beri saran kalau kamu mau.' },
  laugh:  { label: 'Butuh teman tertawa', hint: 'Boleh canda, jangan menghakimi.' },
  share:  { label: 'Berbagi pengalaman', hint: 'Cerita serupa dipersilakan.' },
};

export const ANTI_FLEX_PHRASES = [
  'alhamdulillah diterima', 'gaji dua digit', 'promosi jabatan',
  'bangga mengumumkan', 'humbled and honored', 'excited to announce',
  'thrilled to share', 'bersyukur diterima', 'naik jabatan', 'diterima kerja',
];

export function containsFlex(text: string): boolean {
  const lower = text.toLowerCase();
  return ANTI_FLEX_PHRASES.some((p) => lower.includes(p));
}
