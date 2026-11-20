/**
 * API client for unlinked+ backend.
 * Auth uses HttpOnly cookies (unlinked_session) — always send credentials: 'include'.
 * baseURL is NEXT_PUBLIC_API_URL (e.g. http://192.168.1.20/api) or /api in dev via Next.js rewrite.
 */
import type {
  AdImpression,
  AdPreferences,
  AdminOverview,
  AdminPost,
  AdminReport,
  AdminUser,
  AvatarConfig,
  AvatarItem,
  AuthResponse,
  Certificate,
  Confession,
  InventoryItem,
  PaginatedResponse,
  Poll,
  Post,
  RecoveryResponse,
  Transaction,
  User,
  UserStats,
} from './types';

// Dockerfile sets this ARG to "" when no build arg is passed, so use `||`
// (not `??`) to guarantee the same-origin /api fallback.
const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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

/** Attach an email to the current account so it can be used for password recovery. */
export const authSetEmail = (email: string) =>
  req<RecoveryResponse>('POST', '/auth/email', { email });

/** Always resolves with the same shape whether or not the email exists. */
export const requestPasswordReset = (email: string) =>
  req<RecoveryResponse>('POST', '/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
  req<RecoveryResponse>('POST', '/auth/reset-password', { token, password });

// Admin dashboard
export const adminOverview = () => req<AdminOverview>('GET', '/admin/overview');

export const adminUsers = (page = 1, limit = 20) =>
  req<PaginatedResponse<AdminUser>>('GET', `/admin/users?page=${page}&limit=${limit}`);

export const adminPosts = (page = 1, limit = 20) =>
  req<PaginatedResponse<AdminPost>>('GET', `/admin/posts?page=${page}&limit=${limit}`);

export const adminReports = (page = 1, limit = 20) =>
  req<PaginatedResponse<AdminReport>>('GET', `/admin/reports?page=${page}&limit=${limit}`);

export const adminResolveReport = (id: string, action: 'dismiss' | 'hide') =>
  req<AdminReport>('PATCH', `/admin/reports/${id}`, { action });

export const adminSetUserStatus = (id: string, status: 'active' | 'disabled') =>
  req<AdminUser>('PATCH', `/admin/users/${id}/status`, { status });

// Posts
export const getPosts = (page = 1) =>
  req<PaginatedResponse<Post>>('GET', `/posts?page=${page}`);

export const createPost = (data: { category: string; content: string; spillMode?: string }) =>
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

// Ad preferences (SEC-04) — user controlled, never content-targeted.
export const getAdPreferences = () => req<AdPreferences>('GET', '/users/me/ad-preferences');
export const updateAdPreferences = (data: AdPreferences) =>
  req<AdPreferences>('PATCH', '/users/me/ad-preferences', data);
export const recordAdImpression = () => req<AdImpression>('POST', '/users/me/ad-impressions');

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
