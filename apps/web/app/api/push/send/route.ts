import "server-only";

import { NextRequest } from "next/server";
import webpush from "web-push";
import { apiSuccess, apiError } from "@/lib/api-response";

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@flarepath.app", pub, priv);
  vapidConfigured = true;
  return true;
}

// POST /api/push/send — send push notification (internal use)
export async function POST(request: NextRequest) {
  if (!ensureVapid()) return apiError("Push notifications are not configured.", 503);
  const body = await request.json();
  const { subscription, title, message, url, severity } = body;

  if (!subscription) return apiError("subscription is required", 400);

  const emoji = SEVERITY_EMOJI[severity] ?? "🔔";
  const payload = JSON.stringify({
    title: `${emoji} ${title ?? "Flarepath Alert"}`,
    body: message ?? "New dispatch alert",
    url: url ?? "/",
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return apiSuccess({ sent: true });
  } catch (err) {
    const error = err as Error;
    return apiError(`Push failed: ${error.message}`, 500);
  }
}
