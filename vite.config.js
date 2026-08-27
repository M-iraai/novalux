import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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

function r2Plugin() {
  return {
    name: 'r2-api',
    configureServer(server) {
      // POST /api/upload — upload file to R2, return the key
      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(body => {
          const ct = req.headers['content-type'] || 'application/octet-stream'
          const cd = req.headers['content-disposition'] || ''
          const m = cd.match(/filename="?([^";\n]+)"?/)
          const fname = m ? m[1] : 'upload'
          const ext = fname.split('.').pop() || 'bin'
          const key = `products/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`

          return r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: ct }))
            .then(() => {
              console.log(`[R2] Uploaded ${key} (${body.length} bytes)`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ key }))
            })
        }).catch(err => {
          console.error('[R2] Upload error:', err.message)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        })
      })

      // DELETE /api/delete
      server.middlewares.use('/api/delete', (req, res, next) => {
        if (req.method !== 'DELETE') return next()
        readJSON(req).then(body => {
          if (!body.key) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ error: 'key required' }))
          }
          return r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: body.key }))
            .then(() => {
              console.log(`[R2] Deleted ${body.key}`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            })
        }).catch(err => {
          console.error('[R2] Delete error:', err.message)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        })
      })

      // GET /api/image?key=xxx — serve image from R2
      server.middlewares.use('/api/image', (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const u = new URL(req.url, 'http://localhost')
          const key = u.searchParams.get('key')
          if (!key) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ error: 'key required' }))
          }

          r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
            .then(response => {
              const ct = response.ContentType || 'application/octet-stream'
              const chunks = []
              response.Body.on('data', chunk => chunks.push(chunk))
              response.Body.on('end', () => {
                res.setHeader('Content-Type', ct)
                res.setHeader('Cache-Control', 'public, max-age=86400')
                res.end(Buffer.concat(chunks))
              })
              response.Body.on('error', err => {
                console.error('[R2] Stream error:', err.message)
                res.statusCode = 500
                res.end()
              })
            })
            .catch(err => {
              console.error('[R2] Image not found:', key, err.message)
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Image not found' }))
            })
        } catch (err) {
          res.statusCode = 500
          res.end()
        }
      })

      // GET /api/health
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'ok', bucket: BUCKET }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), r2Plugin()],
})
