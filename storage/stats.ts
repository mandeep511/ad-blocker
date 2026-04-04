export interface Stats {
  totalBlocked: number;
  sessionBlocked: number;
  blockedPerSite: Record<string, number>;
}
