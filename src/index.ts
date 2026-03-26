import Koa from 'koa'
import cors from '@koa/cors'
import logger from 'koa-logger'
import helmet from 'koa-helmet'
import compress from 'koa-compress'
import {koaBody} from 'koa-body'

import prisma from './db'

const app=new Koa()
const port=process.env.PORT||4000

app.use(helmet())
app.use(compress())
app.use(cors({origin:'*'}))
app.use(koaBody())
app.use(logger())



async function start(){
    try{
        await prisma.$connect()
        console.log("Database connected")

        app.listen(port,()=>{
            console.log(`\nEcommerce Searcgg Api running on http://localhost:${port}`)

            console.log('\nAvailable endpoints:')
            console.log(`  GET /api/health`)
            console.log(`  GET /api/stats`)
            console.log(`  GET /api/search?q=laptop&category=Electronics&sort=relevance`)
            console.log(`  GET /api/facets`)
            console.log(`  GET /api/suggest?q=app`)
            console.log(`  GET /api/products`)
            console.log(`  GET /api/products/:id`)
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