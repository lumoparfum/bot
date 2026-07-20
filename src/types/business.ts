export type BusinessRequestStatus = 'pending' | 'approved' | 'rejected';

export type BusinessRequest = {
  id: string;
  uid: string;
  companyName: string;
  description: string;
  status: BusinessRequestStatus;
  createdAt: number;
};
