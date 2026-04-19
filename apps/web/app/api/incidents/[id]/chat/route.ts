import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const MessageSchema = z.object({ message: z.string().min(1) });

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    }
  );
}

// GET /api/incidents/:id/chat — list messages
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("incident_messages")
    .select("*, profiles(full_name, role)")
    .eq("incident_id", params.id)
    .order("created_at", { ascending: true });
  return apiSuccess(data ?? []);
}

// POST /api/incidents/:id/chat — send message
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) return apiError("Message is required", 400);

  const { data, error } = await supabase
    .from("incident_messages")
    .insert({ incident_id: params.id, sender_id: user.id, message: parsed.data.message })
    .select("*, profiles(full_name, role)")
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}
