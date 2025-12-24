export type Folder = {
  id: string;
  name: string;
  company?: string | null;
  hourRate?: number | null;
  linkKeyHash: string;
  createdAt: number;
  updatedAt: number;
};
