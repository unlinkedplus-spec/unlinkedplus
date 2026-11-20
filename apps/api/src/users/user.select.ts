import { Prisma } from '@prisma/client';

// Returned to the account owner and to moderation, where the id is needed.
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  createdAt: true,
  profile: {
    select: {
      avatarConfig: true,
      mentalLevel: true,
      mentalXp: true,
      bio: true,
      isAnonymous: true,
    },
  },
} satisfies Prisma.UserSelect;

// Public feed/comments only need a pseudonym and avatar. Never include the
// internal id here: it is the same value as post.user_id and would undo the
// anonymity guarantees of the public projections.
export const PUBLIC_AUTHOR_SELECT = {
  username: true,
  createdAt: true,
  profile: {
    select: {
      avatarConfig: true,
      mentalLevel: true,
      mentalXp: true,
      bio: true,
      isAnonymous: true,
    },
  },
} satisfies Prisma.UserSelect;
