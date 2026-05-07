import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@halal/config";

export interface StoredFile {
  path: string;
  publicPath: string;
  dataUrl: string | null;
}

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

export async function storeUploadedFile(file: Express.Multer.File): Promise<StoredFile> {
  const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  if (env.STORAGE_DRIVER === "s3") {
    const key = `certificates/${Date.now()}-${file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    return {
      path: key,
      publicPath: `s3://${env.AWS_S3_BUCKET}/${key}`,
      dataUrl
    };
  }

  const targetDir = path.resolve(env.STORAGE_BASE_PATH, "certificates");
  await mkdir(targetDir, { recursive: true });
  const fileName = `${Date.now()}-${file.originalname}`;
  const fullPath = path.join(targetDir, fileName);
  await writeFile(fullPath, file.buffer);

  const publicPath = `/uploads/certificates/${fileName}`;

  return {
    path: publicPath,
    publicPath,
    dataUrl
  };
}
