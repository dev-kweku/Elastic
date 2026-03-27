require('dotenv').config()
import Koa from 'koa'
import cors from '@koa/cors'
import logger from 'koa-logger'
// import helmet from 'koa-helmet'
import compress from 'koa-compress'
import {koaBody} from 'koa-body'
import { errorHandler } from './middleware/error'
import router from './routes'
import prisma from './db'





const app=new Koa()
const port=process.env.PORT||4000

app.use(errorHandler)

// app.use(helmet())
app.use(compress())
app.use(cors({origin:'*'}))
app.use(koaBody())
app.use(logger())

app.use(router.routes())
app.use(router.allowedMethods())



// 404 handler
app.use(async ctx=>{
    ctx.status=404
    ctx.body={
        error:'Route not found',
        path:ctx.path,
        status:404,
        hint:'Try GET /api/health or GET /api/search?q=...'
    }
})

async function start(){
    try{
        // await prisma.$connect()
        // console.log("Database connected")

        await prisma.$queryRaw`SELECT 1`
        console.log('Database connected')

        app.listen(port,()=>{
            console.log(`\nEcommerce Search Api running on http://localhost:${port}`)

            console.log('\nAvailable endpoints:')
            console.log(`  GET /api/health`)
            console.log(`  GET /api/stats`)
            console.log(`  GET /api/search?q=laptop&category=Electronics&sort=relevance`)
            console.log(`  GET /api/facets`)
            console.log(`  GET /api/suggest?q=app`)
            console.log(`  GET /api/products`)
            console.log(`  GET /api/products/:id`)

                console.log('\n📋 Registered routes:')
        router.stack.forEach((r: any) => {
            const methods = r.methods.filter((m: string) => m !== 'HEAD').join('|')
            console.log(`   ${methods.padEnd(6)} ${r.path}`)
        })
        })
    }catch(error:any){
        console.log('failed to start ',error.message)
        await prisma.$disconnect()
        process.exit(1)

    }
}

process.on('SIGINT',async()=>{
    console.log(`\n Shutting down...`)
    await prisma.$disconnect()
    process.exit(0)
})


process.on('SIGTERM',async()=>{
    await prisma.$disconnect()
    process.exit(0)
})

start();

export {app}