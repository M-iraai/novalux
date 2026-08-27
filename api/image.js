import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { key } = req.query
  if (!key) return res.status(400).json({ error: 'key required' })

  try {
    const resp = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }))
    const ct = resp.ContentType || 'application/octet-stream'

    const chunks = []
    for await (const c of resp.Body) chunks.push(c)

    res.setHeader('Content-Type', ct)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(Buffer.concat(chunks))
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found' })
    }
    console.error('[R2 Image] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
