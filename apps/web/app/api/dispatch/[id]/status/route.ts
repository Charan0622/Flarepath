import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const DISPATCH_TRANSITIONS: Record<string, string[]> = {
  assigned: ["acknowledged"],
  acknowledged: ["en_route"],
  en_route: ["on_scene"],
  on_scene: ["returning"],
  returning: ["completed"],
  completed: [],
};

const UpdateStatusSchema = z.object({
  status: z.enum(["assigned", "acknowledged", "en_route", "on_scene", "returning", "completed"]),
});

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

// POST /api/dispatch/:id/status — update dispatch status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const body = await request.json();
  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  // Get current dispatch
  const { data: current } = await supabase
    .from("dispatches")
    .select("status, vehicle_id, incident_id")
    .eq("id", params.id)
    .single();

  if (!current) return apiError("Dispatch not found", 404);

  // Enforce state machine
  const allowed = DISPATCH_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return apiError(
      `Invalid transition: ${current.status} → ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}`,
      409
    );
  }

  // Build update with timestamp
  const timestampField = `${parsed.data.status}_at`;
  const update: Record<string, unknown> = {
    status: parsed.data.status,
    [timestampField]: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from("dispatches")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  // If completed, make vehicle available again
  if (parsed.data.status === "completed") {
    await supabase
      .from("vehicles")
      .update({ status: "available" })
      .eq("id", current.vehicle_id);
  }

  // If on_scene, update incident status
  if (parsed.data.status === "on_scene") {
    await supabase
      .from("incidents")
      .update({ status: "on_scene" })
      .eq("id", current.incident_id);
  }

  return apiSuccess(updated);
}
