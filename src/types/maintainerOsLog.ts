export type MaintainerOsLog = {
  id: string;
  maintainerId: string;
  osId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdByRole: 'ADMIN' | 'THIRD';
  createdAt: number;
  updatedAt: number;
};
