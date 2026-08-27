import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Read raw body
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)

    if (body.length === 0) return res.status(400).json({ error: 'Empty body' })

    // Get filename from query param or header
    const filename = req.query.filename || req.headers['x-filename'] || 'upload'
    const ext = filename.split('.').pop() || 'bin'
    const contentType = req.headers['content-type'] || 'application/octet-stream'
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))

    console.log(`[R2] Uploaded ${key} (${body.length} bytes)`)
    return res.status(200).json({ key })
  } catch (err) {
    console.error('[R2] Upload error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
