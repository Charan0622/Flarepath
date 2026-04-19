import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

// POST /api/push/subscribe — store push subscription on user profile
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const subscription = await request.json();

  // Store subscription in profile metadata
  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: subscription } as Record<string, unknown>)
    .eq("id", user.id);

  // If column doesn't exist yet, that's OK — we'll add it
  if (error && error.code === "42703") {
    // Column doesn't exist — store in user metadata instead
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { push_subscription: subscription },
    });
  }

  return apiSuccess({ subscribed: true });
}
