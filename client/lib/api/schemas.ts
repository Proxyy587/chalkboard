import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return jsonError(message, 401);
}

/** Human-readable Zod / validation errors (no raw Zod dump). */
export function formatZodError(err: unknown): string {
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    if (!first) return "Invalid request";
    const path = first.path.filter(Boolean).join(".");
    const field = path || "input";
    if (first.code === "invalid_string" && first.validation === "url") {
      return `Invalid URL for ${field}. Use a full URL like https://…`;
    }
    if (first.code === "too_small") {
      return `${field} is required.`;
    }
    return path ? `${field}: ${first.message}` : first.message;
  }
  if (err instanceof Error) return err.message;
  return "Invalid request";
}

export const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(["live", "test"]).default("live"),
  type: z.enum(["SECRET", "PUBLIC"]).default("SECRET"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
});

const s3ConfigSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  region: z.string().min(1),
  bucketName: z.string().min(1),
  endpoint: z.string().url().optional(),
  publicUrl: z.string().url().optional(),
  forcePathStyle: z.boolean().optional(),
});

const r2ConfigSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  accountId: z.string().min(1),
  bucketName: z.string().min(1),
  publicUrl: z.string().url().optional(),
});

const uploadThingConfigSchema = z.object({
  token: z.string().min(1),
});

export const storageCreateSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("S3"), name: z.string().min(1).max(100), config: s3ConfigSchema }),
  z.object({ provider: z.literal("R2"), name: z.string().min(1).max(100), config: r2ConfigSchema }),
  z.object({
    provider: z.literal("UPLOADTHING"),
    name: z.string().min(1).max(100),
    config: uploadThingConfigSchema,
  }),
  z.object({
    provider: z.literal("CUSTOM_S3"),
    name: z.string().min(1).max(100),
    config: s3ConfigSchema,
  }),
  z.object({
    provider: z.literal("MINIO"),
    name: z.string().min(1).max(100),
    config: s3ConfigSchema,
  }),
  z.object({
    provider: z.literal("BACKBLAZE"),
    name: z.string().min(1).max(100),
    config: s3ConfigSchema,
  }),
]);
