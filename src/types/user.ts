import { Role } from '../lib/accessControl';

export interface User {
  id: string;
  email: string;
  role: Role;
  displayName?: string;
  createdAt: Date;
  lastLogin?: Date;
  isEmailVerified: boolean;
  metadata?: {
    [key: string]: any;
  };
} 