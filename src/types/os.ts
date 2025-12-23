export type ServiceOrder = {
  id: string;
  osCode: string;
  tag: string;
  machineName: string;
  description: string;
  createdByRole?: 'ADMIN' | 'THIRD';
  createdByUserId?: string | null;
  isExternal?: boolean;
  createdAt: number;
  updatedAt: number;
};
