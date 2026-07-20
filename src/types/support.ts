export type SupportRequestType = 'bug' | 'suggestion' | 'other';

export type SupportRequestInput = {
  uid: string;
  userName: string;
  userEmail: string | null;
  type: SupportRequestType;
  message: string;
};
