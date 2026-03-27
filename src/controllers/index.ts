import {Context} from 'koa'
import { searchProducts,getFacets,getSuggestions,getIndexStats } from '../services/search.service'
import prisma from '../db'

export async function health(ctx:Context){
    try{
        const stats=await getIndexStats()
        ctx.body={
            status:'green',
            db_connected:true,
            product_count:stats.total_documents,
            index_size:stats.index_size_human,
            uptime_seconds:Math.floor(process.uptime()),
            version:'1.0.0',
        }
    }catch(err:unknown){
        ctx.status=503
        ctx.body={
            status:'red',
            db_connected:false,
            uptime_seconds:Math.floor(process.uptime()),
            version:'1.0.0'
        }

    }
}

export async function stats(ctx:Context){
    const stats=await getIndexStats()
    ctx.body={index:'products',...stats}
    
}

export async function search(ctx:Context){
    const results=await searchProducts(ctx.state.validated)
    ctx.body=results
}

export async function facets(ctx:Context){
    const facets=await getFacets(ctx.state.validated)
    ctx.body=facets;
}

export async function suggest(ctx:Context){
    const {q,limit}=ctx.state.validated
    ctx.body=await getSuggestions(q,limit)
}

export async function productsId(ctx:Context){
    const rows = await prisma.$queryRaw<any[]>`
            SELECT * FROM products WHERE id = ${ctx.params.id} LIMIT 1
        `
        if (!rows.length) {
            ctx.status = 404
            ctx.body = { error: 'Product not found', status: 404 }
            return
        }
        ctx.body = rows[0]
}

export async function products(ctx:Context){
    const { page = 1, limit = 20 } = ctx.state.validated
        const offset = (page - 1) * limit
    
        const [rows, countResult] = await Promise.all([
            prisma.$queryRaw<any[]>`
            SELECT * FROM products ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
            `,
            prisma.$queryRaw<[{ total: bigint }]>`SELECT COUNT(*) AS total FROM products`,
        ])
    
        const total = Number(countResult[0].total)
        ctx.body = {
            products: rows,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
        }
}