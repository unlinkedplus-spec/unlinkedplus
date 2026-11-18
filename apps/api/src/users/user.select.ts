import { Prisma } from '@prisma/client';

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
