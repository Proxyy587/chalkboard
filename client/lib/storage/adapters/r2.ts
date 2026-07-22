import { S3Adapter } from "./s3";
import type { R2Config } from "../types";

export class R2Adapter extends S3Adapter {
  constructor(config: R2Config) {
    super({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: "auto",
      bucketName: config.bucketName,
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      publicUrl: config.publicUrl,
      forcePathStyle: true,
    });
  }
}
