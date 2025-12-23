export type Maintainer = {
  id: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  extraMinutes?: number | null;
  shifts?: Array<{ id: string; startTime: string; endTime: string; createdAt?: number }>;
  createdAt: number;
  updatedAt: number;
};
