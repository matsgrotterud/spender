"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthState = {
  error: string | null;
  message: string | null;
};

function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export async function signUp(
  _prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!email || !password || !confirmPassword) {
    return { error: "Email, password and confirm password are required.", message: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", message: null };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", message: null };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/dashboard`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: "This email is already registered. Please sign in instead.",
        message: null,
      };
    }

    return { error: error.message, message: null };
  }

  // Hvis email confirm er PÅ, får du ofte ikke session med én gang
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return {
      error: null,
      message: "Account created. Please check your email to confirm, then sign in.",
    };
  }

  redirect("/dashboard");
}

export async function signIn(
  _prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required.", message: null };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, message: null };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}