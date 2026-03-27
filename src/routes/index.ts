

import Router from '@koa/router'
import { Context } from 'koa'
import { validate, searchSchema, suggestSchema } from '../middleware/validate'
import {
    searchProducts,
    getFacets,
    getSuggestions,
    getIndexStats,
} from '../services/search.service'
import prisma from '../db'

const router = new Router({ prefix: '/api' })

router.get('/health', async (ctx: Context) => {
    const startTime = process.uptime()
    try {
        const stats = await getIndexStats()
        ctx.body = {
        status: 'green',
        db_connected: true,
        product_count: stats.total_documents,
        index_size: stats.index_size_human,
        uptime_seconds: Math.floor(startTime),
        version: '1.0.0',
    }
    } catch {
        ctx.status = 503
        ctx.body = {
        status: 'red',
        db_connected: false,
        uptime_seconds: Math.floor(startTime),
        version: '1.0.0',
        }
    }
})

router.get('/stats', async (ctx: Context) => {
    const stats = await getIndexStats()
    ctx.body = {
        index: 'products',
        ...stats,
    }
})

router.get('/search', validate(searchSchema, 'query'), async (ctx: Context) => {
    const params = ctx.state.validated
    const results = await searchProducts(params)
    ctx.body = results
})

router.get('/facets', validate(searchSchema, 'query'), async (ctx: Context) => {
    const params = ctx.state.validated
    const facets = await getFacets(params)
    ctx.body = facets
})

router.get('/suggest', validate(suggestSchema, 'query'), async (ctx: Context) => {
    const { q, limit } = ctx.state.validated
    const suggestions = await getSuggestions(q, limit)
    ctx.body = suggestions
})

router.get('/products/:id', async (ctx: Context) => {
    const product = await prisma.products.findUnique({
        where: { id: ctx.params.id },
    })
    if (!product) {
    ctx.status = 404
    ctx.body = { error: 'Product not found', status: 404 }
    return
    }
    ctx.body = product
})

router.get('/products', validate(searchSchema, 'query'), async (ctx: Context) => {
    const { page = 1, limit = 20 } = ctx.state.validated
    const [products, total] = await Promise.all([
        prisma.products.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        }),
        prisma.products.count(),
    ])
    ctx.body = {
        products,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
    }
})

export default router