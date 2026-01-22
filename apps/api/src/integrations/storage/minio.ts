import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.STORAGE_ENDPOINT || 'localhost',
  port: parseInt(process.env.STORAGE_PORT || '9000'),
  useSSL: process.env.STORAGE_USE_SSL === 'true',
  accessKey: process.env.STORAGE_ACCESS_KEY || 'minio',
  secretKey: process.env.STORAGE_SECRET_KEY || 'minio_dev',
});

const BUCKET_NAME = process.env.STORAGE_BUCKET || 'dpm-files';

export async function initStorage() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`✅ Created storage bucket: ${BUCKET_NAME}`);

      // Set bucket policy to allow public read access for images
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    }
    console.log(`✅ Storage bucket ready: ${BUCKET_NAME}`);
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = ''
): Promise<string> {
  const key = folder ? `${folder}/${fileName}` : fileName;

  await minioClient.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });

  // Return the URL to access the file
  const endpoint = process.env.STORAGE_PUBLIC_URL || `http://localhost:9000`;
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, key);
}

export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return minioClient.presignedGetObject(BUCKET_NAME, key, expiresInSeconds);
}

export { minioClient, BUCKET_NAME };
