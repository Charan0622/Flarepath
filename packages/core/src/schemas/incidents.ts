import { z } from "zod";

export const IncidentType = z.enum([
  "structure_fire",
  "vehicle_fire",
  "wildfire",
  "medical",
  "hazmat",
  "rescue",
  "false_alarm",
  "other",
]);

export const Severity = z.enum(["low", "medium", "high", "critical"]);

export const IncidentStatus = z.enum([
  "open",
  "triaged",
  "dispatched",
  "on_scene",
  "resolved",
  "cancelled",
]);

export const CreateIncidentSchema = z.object({
  reporter_name: z.string().min(1).optional(),
  reporter_phone: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1),
  type: IncidentType,
  description: z.string().min(1),
  hazards: z.array(z.string()).default([]),
});

export const UpdateIncidentSchema = z.object({
  status: IncidentStatus.optional(),
  severity: Severity.optional(),
  description: z.string().min(1).optional(),
  hazards: z.array(z.string()).optional(),
});

export const IncidentFilterSchema = z.object({
  status: IncidentStatus.optional(),
  severity: Severity.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// State machine: valid transitions
export const INCIDENT_TRANSITIONS: Record<string, string[]> = {
  open: ["triaged", "cancelled"],
  triaged: ["dispatched", "cancelled"],
  dispatched: ["on_scene", "cancelled"],
  on_scene: ["resolved"],
  resolved: [],
  cancelled: [],
};

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentSchema>;
export type IncidentFilter = z.infer<typeof IncidentFilterSchema>;
export type IncidentStatusType = z.infer<typeof IncidentStatus>;
export type SeverityType = z.infer<typeof Severity>;
export type IncidentTypeType = z.infer<typeof IncidentType>;
