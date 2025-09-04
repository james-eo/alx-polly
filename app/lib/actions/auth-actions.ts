"use server";

import { createClient } from "@/lib/supabase/server";
import { LoginFormData, RegisterFormData, AuthActionReturn } from "../types";
import { z } from "zod";

// Define Zod schema for registration data
const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name is required and must be at least 2 characters.")
    .max(50, "Name cannot exceed 50 characters."),
  email: z.string().email("Invalid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character.",
    ),
});

export async function login(data: LoginFormData): Promise<AuthActionReturn> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    // Return a generic error message to prevent user enumeration
    return { error: "Invalid credentials." };
  }

  // Success: no error
  return { error: null };
}

export async function register(
  data: RegisterFormData,
): Promise<AuthActionReturn> {
  // Validate input data using Zod
  const validationResult = RegisterSchema.safeParse(data);

  if (!validationResult.success) {
    // Extract and return validation errors
    const errors = validationResult.error.flatten().fieldErrors;
    return { error: errors };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    // Return a generic error message for Supabase errors during registration
    // or a more specific one if it's safe and helpful for the user.
    // For now, we'll keep it generic to avoid disclosing too much.
    return { error: "Registration failed. Please try again." };
  }

  // Success: no error
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
