/** Video API storage — pass inline creds or a saved integration id */

export type InlineR2Storage = {
  provider: "r2";
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  account_id: string;
  public_url?: string;
};

export type InlineS3Storage = {
  provider: "s3" | "custom_s3" | "minio" | "backblaze";
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  region?: string;
  endpoint?: string;
  public_url?: string;
  force_path_style?: boolean;
};

export type VideoStorageRequest = {
  /** Credentials in this request only — never stored on our servers */
  inline?: InlineR2Storage | InlineS3Storage;
  /** ID from Settings → Storage */
  integration_id?: string;
};

export type VideoRequestBody = {
  prompt: string;
  model?: string;
  engine?: "auto" | "manim" | "remotion";
  duration?: number;
  storage?: VideoStorageRequest;
  /** Platform proxy only — free-tier quality pins */
  watermark?: boolean;
  max_height?: number;
};

export type VideoJobResponse = {
  job_id: string;
  status: string;
  cached?: boolean;
  video_url?: string | null;
  engine?: string | null;
};

export type VideoStatusResponse = {
  job_id: string;
  status: string;
  video_url?: string | null;
  error?: string | null;
  cached?: boolean;
  engine?: string | null;
  duration?: number | null;
};
