import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { filename, contentType } = req.body
    if (!filename) return res.status(400).json({ error: 'filename required' })

    const ext = filename.split('.').pop() || 'bin'
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    })

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 600 })

    return res.status(200).json({ presignedUrl, key })
  } catch (err) {
    console.error('[R2] Upload error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
