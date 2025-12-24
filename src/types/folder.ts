export type Folder = {
  id: string;
  name: string;
  company?: string | null;
  hourRate?: number | null;
  hourRate50?: number | null;
  hourRate100?: number | null;
  linkKeyHash: string;
  createdAt: number;
  updatedAt: number;
};
