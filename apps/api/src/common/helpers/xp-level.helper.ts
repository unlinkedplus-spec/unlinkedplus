export interface LevelThreshold {
  level: number;
  minXp: number;
  name: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minXp: 0, name: 'Rapuh' },
  { level: 2, minXp: 50, name: 'Tahan Banting' },
  { level: 3, minXp: 150, name: 'Kebal Revisi' },
  { level: 4, minXp: 300, name: 'Kebal PHP HRD' },
  { level: 5, minXp: 500, name: 'Suhu Spill' },
];

export const XP_REWARDS = {
  postCreated: 10,
  reactionReceived: { pukpuk: 2, ngakak: 1, sama: 3 } as Record<string, number>,
};

export function calculateLevel(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (safeXp >= threshold.minXp) level = threshold.level;
  }
  return level;
}

export function getLevelName(xp: number): string {
  const level = calculateLevel(xp);
  return LEVEL_THRESHOLDS.find((t) => t.level === level)?.name ?? 'Rapuh';
}

export function getLevelProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const current = [...LEVEL_THRESHOLDS].reverse().find((t) => safeXp >= t.minXp) ?? LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((t) => t.level === current.level + 1);
  const progress = next
    ? Math.round(((safeXp - current.minXp) / (next.minXp - current.minXp)) * 100)
    : 100;
  return {
    level: current.level,
    name: current.name,
    xp: safeXp,
    minXp: current.minXp,
    nextXp: next?.minXp ?? null,
    progress: Math.min(100, Math.max(0, progress)),
  };
}
