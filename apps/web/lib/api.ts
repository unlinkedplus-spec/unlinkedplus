export type AvatarConfig = { character: string; accessories: string[] };
export type User = {
  id: string; username: string; createdAt: string; role?: string;
  profile: { avatarConfig: AvatarConfig | null; mentalXp: number; mentalLevel: number; bio: string | null; isAnonymous: boolean } | null;
};
export type Page<T> = { data: T[]; total: number; page: number; totalPages: number };
export type ReactionType = 'pukpuk' | 'ngakak' | 'sama';
export type ReactionState = { counts: Record<ReactionType, number>; userReactions: Record<ReactionType, boolean> };
export type Post = {
  id: string; user: User | null; category: string; content: string; createdAt: string;
  _count: { comments: number; reactions: number }; reactionCounts: Record<ReactionType, number>;
};
export type Comment = { id: string; user: User | null; content: string; createdAt: string };
export type Item = { id: string; slug: string; name: string; itemType: string | null; price: number; isPremium: boolean };
export type Inventory = { itemId: string; item: Item }[];
export type Transaction = { id: string; itemId: string | null; item?: Item | null; amount: number; paymentStatus: string; mode?: string; qrisPayload?: string | null; createdAt: string };
export type Certificate = { id: string; status: 'pending' | 'ready' | 'failed'; downloadUrl?: string | null };
export type Stats = { posts: number; reactionsReceived: number; commentsReceived: number; mentalXp: number; mentalLevel: number };
export const categories = ['Ditolak HRD', 'Salah Kirim Chat', 'Dimarahi Bos', 'Bisnis Boncos', 'Salah Jurusan'] as const;
export const defaultAvatar: AvatarConfig = { character: 'panda', accessories: [] };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options, credentials: 'include', cache: 'no-store',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Koneksi terputus. Periksa jaringan lalu coba lagi.');
  }
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch {
    throw new ApiError(response.status, response.ok ? 'Respons server tidak terbaca. Coba lagi.' : `Layanan belum tersedia (${response.status}). Coba lagi nanti.`);
  }
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(' · ') : body?.message;
    throw new ApiError(response.status, typeof message === 'string' ? message : `Permintaan gagal (${response.status}). Silakan coba lagi.`);
  }
  return body as T;
}
export const json = (value: unknown) => JSON.stringify(value);
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
export const isAborted = (error: unknown) => error instanceof Error && error.name === 'AbortError';
export function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Waktu tidak tersedia' : date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
