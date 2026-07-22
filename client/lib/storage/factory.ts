import type { StorageIntegration, StorageProvider } from "@prisma/client";

import { decryptCredentials } from "@/lib/crypto/storage";

import { R2Adapter } from "./adapters/r2";
import { S3Adapter } from "./adapters/s3";
import { UploadThingAdapter } from "./adapters/uploadthing";
import type { R2Config, S3CompatibleConfig, StorageAdapter, UploadThingConfig } from "./types";

function adapterFromDecrypted(
  provider: StorageProvider,
  config: Record<string, string>
): StorageAdapter {
  switch (provider) {
    case "R2":
      return new R2Adapter(config as unknown as R2Config);
    case "S3":
    case "CUSTOM_S3":
    case "MINIO":
    case "BACKBLAZE":
      return new S3Adapter(config as unknown as S3CompatibleConfig);
    case "UPLOADTHING":
      return new UploadThingAdapter(config as unknown as UploadThingConfig);
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

export function createStorageAdapterFromIntegration(
  integration: Pick<StorageIntegration, "provider" | "encryptedConfig">
): StorageAdapter {
  const config = decryptCredentials<Record<string, string>>(integration.encryptedConfig);
  return adapterFromDecrypted(integration.provider, config);
}

export async function testStorageConfig(
  provider: StorageProvider,
  config: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const adapter = adapterFromDecrypted(provider, config as Record<string, string>);
  return adapter.testConnection();
}

export function createStorageAdapterForTest(
  provider: StorageProvider,
  config: Record<string, unknown>
): StorageAdapter {
  return adapterFromDecrypted(provider, config as Record<string, string>);
}
