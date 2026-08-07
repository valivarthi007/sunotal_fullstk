import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

export const uploadRouter = Router();

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jcs-raju-sunotal-final';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Direct Base64 Image Upload Route to S3 under images/ prefix
uploadRouter.post('/upload', async (req, res) => {
  try {
    const { filename, data, folder = 'images' } = req.body;

    if (!filename || !data) {
      return res.status(400).json({ error: 'Filename and base64 data are required.' });
    }

    // Clean base64 string
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique object key under images/ prefix
    const ext = path.extname(filename) || '.jpg';
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const objectKey = `${folder}/${uniqueFilename}`;

    let imageUrl = '';

    // Attempt S3 upload
    try {
      const s3Client = new S3Client({ region: REGION });
      const contentType = filename.endsWith('.png') ? 'image/png' : (filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType
      }));

      const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
      if (cdnDomain) {
        imageUrl = `${cdnDomain}/${objectKey}`;
      } else {
        imageUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${objectKey}`;
      }
      console.log(`✅ Uploaded image to S3: ${imageUrl}`);
    } catch (s3Error) {
      console.warn('⚠️ S3 upload failed, falling back to local storage:', s3Error);
    }

    // Local Fallback if S3 is not reachable or local dev mode
    if (!imageUrl) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(localFilePath, buffer);
      imageUrl = `/uploads/${uniqueFilename}`;
      console.log(`✅ Saved image locally: ${imageUrl}`);
    }

    return res.status(200).json({
      success: true,
      url: imageUrl,
      key: objectKey
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload image.' });
  }
});
