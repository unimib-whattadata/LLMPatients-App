export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: Date | null;
  image: string | null;
};

export type UserActivity = {
  id: number;
  type: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};
