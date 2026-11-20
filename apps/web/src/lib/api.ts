/**
 * API client for unlinked+ backend.
 * Auth uses HttpOnly cookies (unlinked_session) — always send credentials: 'include'.
 * baseURL is NEXT_PUBLIC_API_URL (e.g. http://192.168.1.20/api) or /api in dev via Next.js rewrite.
 */
import type {
  AvatarConfig,
  AvatarItem,
  AuthResponse,
  Certificate,
  Confession,
  InventoryItem,
  PaginatedResponse,
  Poll,
  Post,
  Transaction,
  User,
  UserStats,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body != null ? { 'Content-Type': 'application/json' } : {},
    body: body != null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json() as { message?: string | string[] };
      if (Array.isArray(data.message)) message = data.message.join(', ');
      else if (data.message) message = data.message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export const authRegister = (data: { username?: string; password: string; email?: string }) =>
  req<AuthResponse>('POST', '/auth/register', data);

export const authLogin = (data: { username: string; password: string }) =>
  req<AuthResponse>('POST', '/auth/login', data);

export const authMe = () => req<User>('GET', '/auth/me');

export const authLogout = () => req<{ success: boolean }>('POST', '/auth/logout');

// Posts
export const getPosts = (page = 1) =>
  req<PaginatedResponse<Post>>('GET', `/posts?page=${page}`);

export const createPost = (data: { category: string; content: string }) =>
  req<Post>('POST', '/posts', data);

export const getPost = (id: string) => req<Post>('GET', `/posts/${id}`);

export const deletePost = (id: string) => req<void>('DELETE', `/posts/${id}`);

// Reactions
export const toggleReaction = (postId: string, type: string) =>
  req<{ added: boolean; counts: { pukpuk: number; ngakak: number; sama: number } }>(
    'POST', `/posts/${postId}/reactions`, { type },
  );

export const getReactions = (postId: string) =>
  req<{ pukpuk: number; ngakak: number; sama: number }>('GET', `/posts/${postId}/reactions`);

export const getMyReactions = (postId: string) =>
  req<{ pukpuk: boolean; ngakak: boolean; sama: boolean }>('GET', `/posts/${postId}/reactions/me`);

// Comments
export const getComments = (postId: string) =>
  req<Post[]>('GET', `/posts/${postId}/comments`);

export const createComment = (postId: string, content: string) =>
  req<unknown>('POST', `/posts/${postId}/comments`, { content });

// Users / Profile
export const getProfile = (username: string) =>
  req<User>('GET', `/users/${username}`);

export const updateProfile = (data: { bio?: string; avatarConfig?: AvatarConfig; username?: string }) =>
  req<User>('PATCH', '/users/me', data);

export const getInventory = () =>
  req<InventoryItem[]>('GET', '/users/me/inventory');

export const getMyPosts = (page = 1) =>
  req<PaginatedResponse<Post>>('GET', `/users/me/posts?page=${page}`);

export const getMyStats = () => req<UserStats>('GET', '/users/me/stats');

// Avatar items
export const getAvatarItems = () => req<AvatarItem[]>('GET', '/avatar/items');

// Store
export const purchase = (itemId: string) =>
  req<Transaction>('POST', '/store/purchase', { itemId });

export const confirmPurchase = (transactionId: string) =>
  req<Transaction>('POST', `/store/purchase/confirm/${transactionId}`);

export const getTransactions = () =>
  req<Transaction[]>('GET', '/store/transactions');

// Polls
export const getActivePoll = () => req<Poll | null>('GET', '/polls/active');

export const getPollResults = (id: string) => req<Poll>('GET', `/polls/${id}/results`);

export const getMyPollVote = (id: string) =>
  req<{ optionId: string | null }>('GET', `/polls/${id}/mine`);

export const votePoll = (id: string, optionId: string) =>
  req<Poll>('POST', `/polls/${id}/vote`, { optionId });

// Confessions
export const getConfessions = (page = 1) =>
  req<PaginatedResponse<Confession>>('GET', `/confessions?page=${page}`);

export const createConfession = (data: { content: string; isAnonymous?: boolean; scheduledAt?: string }) =>
  req<Confession>('POST', '/confessions', data);

// Certificates
export const createCertificate = (postId: string) =>
  req<Certificate>('POST', '/certificates', { postId });

export const getCertificate = (id: string) =>
  req<Certificate>('GET', `/certificates/${id}`);
