import { UTApi } from "uploadthing/server";

import type {
  ConnectionTestResult,
  StorageAdapter,
  UploadParams,
  UploadResult,
  UploadThingConfig,
} from "../types";

export class UploadThingAdapter implements StorageAdapter {
  private utapi: UTApi;

  constructor(config: UploadThingConfig) {
    this.utapi = new UTApi({ token: config.token });
  }

  async upload({ key, buffer, mimeType }: UploadParams): Promise<UploadResult> {
    const filename = key.split("/").pop() ?? "file";
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });
    const response = await this.utapi.uploadFiles([file]);
    const first = response[0];
    if (!first?.data) {
      throw new Error(first?.error?.message ?? "UploadThing upload failed");
    }
    return {
      url: first.data.url,
      key: first.data.key,
      size: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.utapi.deleteFiles([key]);
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const response = await this.utapi.getSignedURL(key, { expiresIn: expiresInSeconds });
    return response.url;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.utapi.listFiles({ limit: 1 });
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "UploadThing connection failed",
      };
    }
  }
}
