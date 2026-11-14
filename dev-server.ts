// Dev lokal untuk /api/* : `npm run dev:api` (jalan di :3001, di-proxy oleh Vite)
import { serve } from '@hono/node-server'
import { app } from './api/index'

serve({ fetch: app.fetch, port: 3001 }, (i) => console.log(`API → http://localhost:${i.port}/api/health`))