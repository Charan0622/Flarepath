import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEMO_EMAIL = "demo@flarepath.app";
const DEMO_PASSWORD = "demo-flarepath-2026";
const SEED_ORG_ID = "4a780897-794c-42eb-9944-e81cb8e00623";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/auth/demo — create or sign in as demo dispatcher
export async function POST() {
  // Check if demo user exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

  if (!demoUser) {
    // Create demo user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo Dispatcher", role: "dispatcher" },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Create profile
    if (newUser.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        organization_id: SEED_ORG_ID,
        role: "dispatcher",
        full_name: "Demo Dispatcher",
        phone: "+1 408-555-0000",
        skills: ["HAZMAT", "EMT"],
        current_status: "available",
      });
    }
  }

  // Sign in with the demo credentials using the SSR client (sets cookies)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
