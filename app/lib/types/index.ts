import { z } from "zod";

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
  endDate?: Date;
  settings: PollSettings;
}

export interface PollSettings {
  allowMultipleVotes: boolean;
  requireAuthentication: boolean;
}

// Vote types
export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId?: string; // Optional if anonymous voting is allowed
  createdAt: Date;
}

// Form types
export interface CreatePollFormData {
  title: string;
  description?: string;
  options: string[];
  settings: PollSettings;
  endDate?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

// Zod field errors type
export type ZodFieldErrors = {
  name?: string[];
  email?: string[];
  password?: string[];
};

// Auth action return type
export type AuthActionReturn = { error: ZodFieldErrors | string | null };
