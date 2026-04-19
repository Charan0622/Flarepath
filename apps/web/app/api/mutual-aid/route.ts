import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const AidRequestSchema = z.object({
  incident_id: z.string().uuid(),
  resources_needed: z.string().min(1),
  notes: z.string().optional(),
});

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

// GET /api/mutual-aid — list aid requests
export async function GET() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("mutual_aid_requests")
    .select("*, incidents(type, severity, address)")
    .order("created_at", { ascending: false });
  return apiSuccess(data ?? []);
}

// POST /api/mutual-aid — create aid request
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = AidRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) return apiError("Profile not found", 404);

  const { data, error } = await supabase
    .from("mutual_aid_requests")
    .insert({ ...parsed.data, requesting_org_id: profile.organization_id })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}
