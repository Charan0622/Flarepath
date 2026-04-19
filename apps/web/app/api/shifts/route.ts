import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const CreateShiftSchema = z.object({
  profile_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  notes: z.string().optional(),
});

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

// GET /api/shifts — list shifts
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("shifts")
    .select("*, profiles(full_name, role)")
    .gte("start_time", `${date}T00:00:00Z`)
    .lte("start_time", `${date}T23:59:59Z`)
    .order("start_time");

  return apiSuccess(data ?? []);
}

// POST /api/shifts — create shift
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = CreateShiftSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) return apiError("Profile not found", 404);

  const { data, error } = await supabase
    .from("shifts")
    .insert({ ...parsed.data, organization_id: profile.organization_id })
    .select("*, profiles(full_name, role)")
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}
