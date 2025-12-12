"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ServiceCategory = "mobile" | "internet" | "energy" | "insurance";

interface CategoryAnswers {
  mobile?: {
    current_provider: string;
    monthly_cost: string;
    data_gb: string;
  };
  internet?: {
    current_provider: string;
    monthly_cost: string;
  };
  energy?: {
    postal_code: string;
    current_provider: string;
    monthly_cost: string;
  };
  insurance?: Record<string, never>;
}

export async function submitOnboarding(
  categories: ServiceCategory[],
  answers: CategoryAnswers
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du må være logget inn" };
  }

  try {
    // Create a request for each selected category
    for (const category of categories) {
      const categoryAnswers = answers[category] || {};

      // Extract postal_code if present (only for energy)
      const postalCode = category === "energy" && answers.energy?.postal_code
        ? answers.energy.postal_code
        : null;

      // Build the answers JSON object (excluding postal_code which goes in its own column)
      const answersJson: Record<string, unknown> = { ...categoryAnswers };
      if (category === "energy") {
        delete answersJson.postal_code;
      }

      const { error } = await supabase.from("user_requests").insert({
        user_id: user.id,
        service_type: category,
        postal_code: postalCode,
        answers: answersJson,
      });

      if (error) {
        console.error("Error inserting request:", error);
        return { error: `Kunne ikke lagre forespørsel for ${category}` };
      }
    }

    // Mark onboarding as completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't fail the whole operation for this
    }

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (error) {
    console.error("Onboarding error:", error);
    return { error: "Noe gikk galt. Prøv igjen." };
  }
}

export async function getUserRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", requests: [] };
  }

  const { data: requests, error } = await supabase
    .from("user_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching requests:", error);
    return { error: error.message, requests: [] };
  }

  return { requests: requests || [] };
}

export async function checkOnboardingStatus(): Promise<{
  completed: boolean;
  hasRequests: boolean;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { completed: false, hasRequests: false };
  }

  // Check profile for onboarding_completed flag
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  // Also check if user has any requests (fallback check)
  const { data: requests } = await supabase
    .from("user_requests")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const hasRequests = (requests?.length ?? 0) > 0;
  const completed = profile?.onboarding_completed === true || hasRequests;

  return { completed, hasRequests };
}

export async function deleteUserRequest(
  requestId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du må være logget inn" };
  }

  const { error } = await supabase
    .from("user_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting request:", error);
    return { error: "Kunne ikke slette forespørsel" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
