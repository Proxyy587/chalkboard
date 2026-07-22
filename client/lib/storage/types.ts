export interface UploadParams {
  key: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  bucketName?: string;
  region?: string;
}

export interface StorageAdapter {
  upload(params: UploadParams): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  testConnection(): Promise<ConnectionTestResult>;
}

export type S3CompatibleConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
};

export type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  bucketName: string;
  publicUrl?: string;
};

export type UploadThingConfig = {
  token: string;
};
