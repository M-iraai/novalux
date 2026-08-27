import { createServer } from 'node:http'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import 'dotenv/config'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET
const PUBLIC_URL = process.env.R2_PUBLIC_URL

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
}

function sendJSON(res, code, obj) {
  cors(res)
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const parts = []
    req.on('data', p => parts.push(p))
    req.on('end', () => ok(Buffer.concat(parts)))
    req.on('error', fail)
  })
}

function readJSON(req) {
  return new Promise((ok) => {
    const parts = []
    req.on('data', p => parts.push(p))
    req.on('end', () => {
      try { ok(JSON.parse(Buffer.concat(parts).toString())) }
      catch { ok({}) }
    })
    req.on('error', () => ok({}))
  })
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      cors(res)
      res.writeHead(204)
      res.end()
      return
    }

    // POST /api/upload — raw body straight to R2
    if (req.method === 'POST' && req.url === '/api/upload') {
      const body = await readBody(req)
      const ct = req.headers['content-type'] || 'application/octet-stream'
      const cd = req.headers['content-disposition'] || ''
      const match = cd.match(/filename="?([^";\n]+)"?/)
      const fname = match ? match[1] : 'upload'
      const ext = fname.split('.').pop() || 'bin'
      const key = `products/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`

      await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: ct }))
      console.log(`[R2] Uploaded ${key} (${body.length} bytes)`)
      sendJSON(res, 200, { publicUrl: `${PUBLIC_URL}/${key}`, key })
      return
    }

    // DELETE /api/delete
    if (req.method === 'DELETE' && req.url === '/api/delete') {
      const body = await readJSON(req)
      if (!body.key) { sendJSON(res, 400, { error: 'key required' }); return }
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: body.key }))
      console.log(`[R2] Deleted ${body.key}`)
      sendJSON(res, 200, { success: true })
      return
    }

    // GET /api/image?key=xxx
    if (req.method === 'GET' && req.url.startsWith('/api/image')) {
      const u = new URL(req.url, 'http://localhost')
      const key = u.searchParams.get('key')
      if (!key) { sendJSON(res, 400, { error: 'key required' }); return }

      const resp = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      const ct = resp.ContentType || 'application/octet-stream'
      const chunks = []
      for await (const c of resp.Body) chunks.push(c)

      cors(res)
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' })
      res.end(Buffer.concat(chunks))
      return
    }

    // GET /api/health
    if (req.method === 'GET' && req.url === '/api/health') {
      sendJSON(res, 200, { status: 'ok', bucket: BUCKET })
      return
    }

    sendJSON(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error('[R2] Error:', err.message)
    try {
      if (!res.headersSent) sendJSON(res, 500, { error: err.message })
    } catch {}
  }
})

server.on('error', (err) => {
  console.error('[R2] Server error:', err.message)
})

process.on('uncaughtException', (err) => console.error('[R2] Uncaught:', err.message))
process.on('unhandledRejection', (err) => console.error('[R2] Unhandled:', err?.message || err))

const PORT = 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[R2] Server running on http://localhost:${PORT}`)
})
