import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { key } = req.body
    if (!key) return res.status(400).json({ error: 'key required' })

    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }))
    console.log(`[R2] Deleted ${key}`)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[R2] Delete error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
