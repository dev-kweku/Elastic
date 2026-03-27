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