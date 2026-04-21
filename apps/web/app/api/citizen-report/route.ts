import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const ReportSchema = z.object({
  reporter_name: z.string().optional(),
  reporter_phone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  description: z.string().min(1),
});

// POST /api/citizen-report — public endpoint, no auth required
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return apiError("Citizen reporting is not configured.", 503);
  const supabase = createClient(url, serviceKey);

  const body = await request.json();
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const { latitude, longitude, ...rest } = parsed.data;

  const { data, error } = await supabase
    .from("citizen_reports")
    .insert({
      ...rest,
      location: `POINT(${longitude} ${latitude})`,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}
