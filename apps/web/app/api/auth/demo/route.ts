import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SEED_ORG_ID = "4a780897-794c-42eb-9944-e81cb8e00623";
const PASSWORD = "demo-flarepath-2026";

const DEMO_USERS: Record<string, { email: string; name: string; role: string; skills: string[]; phone: string }> = {
  dispatcher: {
    email: "dispatcher@flarepath.demo",
    name: "Sarah Mitchell",
    role: "dispatcher",
    skills: ["DISPATCH", "COMMS"],
    phone: "+1 408-555-0001",
  },
  chief: {
    email: "chief@flarepath.demo",
    name: "Captain James Rivera",
    role: "chief",
    skills: ["HAZMAT", "COMMAND", "RESCUE"],
    phone: "+1 408-555-0002",
  },
  firefighter: {
    email: "crew@flarepath.demo",
    name: "Marcus Thompson",
    role: "firefighter",
    skills: ["EMT", "ROPE_RESCUE", "DRIVER"],
    phone: "+1 408-555-0003",
  },
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase is not configured");
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const roleKey = (body.role as string) ?? "dispatcher";
  const demoUser = DEMO_USERS[roleKey];

  if (!demoUser) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabaseAdmin = getAdmin();

  // Check if user exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === demoUser.email);

  if (!existing) {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: demoUser.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: demoUser.name, role: demoUser.role },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (newUser.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        organization_id: SEED_ORG_ID,
        role: demoUser.role,
        full_name: demoUser.name,
        phone: demoUser.phone,
        skills: demoUser.skills,
        current_status: "available",
      });
    }
  }

  // Sign in
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
    email: demoUser.email,
    password: PASSWORD,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true, role: demoUser.role, name: demoUser.name } });
}
