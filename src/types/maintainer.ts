import type { MaintainerOsLog } from './maintainerOsLog';

export type Maintainer = {
  id: string;
  date: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  extraMinutes?: number | null;
  shifts?: Array<{ id: string; startTime: string; endTime: string; createdAt?: number }>;
  osLogs?: MaintainerOsLog[];
  createdAt: number;
  updatedAt: number;
};
