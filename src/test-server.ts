// Minimal Koa server to isolate the routing issue
// Run with: pnpm ts-node --transpile-only src/test-server.ts

require('dotenv').config()

import Koa from 'koa'
import Router from '@koa/router'

const app = new Koa()
const router = new Router({ prefix: '/api' })

router.get('/ping', async (ctx) => {
  ctx.body = { ok: true, message: 'pong', DATABASE_URL_SET: !!process.env.DATABASE_URL }
})

console.log('Routes registered:', router.stack.map(r => r.path))

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async ctx => {
  ctx.body = {
    msg: 'hit 404 handler',
    path: ctx.path,
    routes: router.stack.map(r => r.path)
  }
})

app.listen(4001, () => {
  console.log('Test server running on http://localhost:4001')
  console.log('Hit: http://localhost:4001/api/ping')
})