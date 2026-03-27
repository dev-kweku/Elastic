
require('dotenv').config()

import Koa from 'koa'
import cors from '@koa/cors'
import logger from 'koa-logger'
import compress from 'koa-compress'
import { koaBody } from 'koa-body'
import { errorHandler } from './middleware/error'
import router from './routes'
import prisma from './db'
import bodyParser from 'koa-bodyparser'

const app = new Koa()
const PORT = process.env.PORT || 4000

console.log('Router type:', typeof router)
console.log('Router routes fn:', typeof router.routes)
console.log('Registered routes:', router.stack?.map((r: any) => r.path) ?? 'none')

app.use(errorHandler)
app.use(compress())
app.use(cors({ origin: '*' }))
app.use(koaBody())
app.use(logger())
app.use(bodyParser())

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async ctx => {
    ctx.body = {
        msg: 'hit 404 handler',
        path: ctx.path,
        routes: router.stack.map(r => r.path)
    }
})

    async function start() {
    try {
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL)
    await prisma.$queryRaw`SELECT 1`
    console.log(' Database connected')

    app.listen(PORT, () => {
        console.log(`\n API running → http://localhost:${PORT}`)
        console.log('\n Registered routes:')
        router.stack?.forEach((r: any) => {
            const methods = r.methods?.filter((m: string) => m !== 'HEAD').join('|') ?? ''
            console.log(`   ${methods.padEnd(6)} ${r.path}`)
        })
        })
    } catch (err: any) {
        console.error(' Failed to start:', err.message)
        process.exit(1)
    }
}

process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })

start()
// export { app }