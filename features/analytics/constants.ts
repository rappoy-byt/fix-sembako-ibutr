export type Period = '7d' | '30d' | '90d';

export const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 Hari',
  '30d': '30 Hari',
  '90d': '90 Hari',
};