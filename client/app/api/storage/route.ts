import { NextResponse } from "next/server";

import { jsonError, formatZodError, storageCreateSchema, unauthorized } from "@/lib/api/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { encryptCredentials } from "@/lib/crypto/storage";
import { db } from "@/lib/db";
import { testStorageConfig } from "@/lib/storage/factory";

export async function GET() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const integrations = await db.storageIntegration.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      provider: true,
      bucketName: true,
      region: true,
      publicUrl: true,
      isActive: true,
      isVerified: true,
      verifiedAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ integrations });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  let input;
  try {
    input = storageCreateSchema.parse(await req.json());
  } catch (e) {
    return jsonError(formatZodError(e), 400);
  }

  const test = await testStorageConfig(input.provider, input.config);
  if (!test.success) {
    const raw = test.error ?? "unknown";
    const friendly =
      /CERTIFICATE|SSL|TLS|handshake/i.test(raw)
        ? "Could not connect securely to the storage endpoint. Check the endpoint URL and credentials."
        : /InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|403/i.test(raw)
          ? "Storage rejected the credentials. Check access key, secret, and bucket permissions."
          : /NoSuchBucket|404/i.test(raw)
            ? "Bucket not found. Check the bucket name."
            : "Could not verify storage. Check bucket, region/endpoint, and credentials.";
    return jsonError(friendly, 400);
  }

  const encryptedConfig = encryptCredentials(input.config);
  const bucketName =
    input.provider === "UPLOADTHING"
      ? "uploadthing"
      : "bucketName" in input.config
        ? input.config.bucketName
        : "default";
  const region = "region" in input.config ? input.config.region : null;
  const publicUrl = "publicUrl" in input.config ? input.config.publicUrl ?? null : null;

  const integration = await db.storageIntegration.create({
    data: {
      userId: user.id,
      name: input.name,
      provider: input.provider,
      encryptedConfig,
      bucketName,
      region,
      publicUrl,
      isVerified: true,
      verifiedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      provider: true,
      bucketName: true,
      isVerified: true,
    },
  });

  return NextResponse.json(integration);
}
