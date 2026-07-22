import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  ConnectionTestResult,
  S3CompatibleConfig,
  StorageAdapter,
  UploadParams,
  UploadResult,
} from "../types";

export class S3Adapter implements StorageAdapter {
  private client: S3Client;
  private config: S3CompatibleConfig;

  constructor(config: S3CompatibleConfig) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint
        ? {
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle ?? true,
          }
        : {}),
    });
  }

  async upload({ key, buffer, mimeType, metadata }: UploadParams): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: metadata,
      })
    );

    const url = this.config.publicUrl
      ? `${this.config.publicUrl.replace(/\/$/, "")}/${key}`
      : `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;

    return { url, key, size: buffer.length };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      })
    );
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.config.bucketName,
        })
      );
      return {
        success: true,
        bucketName: this.config.bucketName,
        region: this.config.region,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Connection failed",
      };
    }
  }
}
