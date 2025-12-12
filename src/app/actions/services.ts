"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ServiceType = "mobile" | "internet" | "energy";

export interface CreateServiceInput {
  service_type: ServiceType;
  current_provider: string;
  monthly_cost: number;
  postal_code: string;
}

export async function createService(input: CreateServiceInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("user_services").insert({
    user_id: user.id,
    service_type: input.service_type,
    current_provider: input.current_provider,
    monthly_cost: Math.round(input.monthly_cost * 100), // Convert to øre/cents
    postal_code: input.postal_code,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getUserServices() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", services: [] };
  }

  const { data, error } = await supabase
    .from("user_services")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, services: [] };
  }

  return { services: data };
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_services")
    .delete()
    .eq("id", serviceId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
