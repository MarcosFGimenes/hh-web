export type Folder = {
  id: string;
  name: string;
  company?: string | null;
  hourRate?: number | null;
  hourRate50?: number | null;
  hourRate100?: number | null;
  normalHoursPerDay?: number | null;
  signatures?: Array<{ name: string; role: string }> | null;
  linkKeyHash: string;
  createdAt: number;
  updatedAt: number;
};
