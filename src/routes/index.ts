

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

    const router = new Router()

    router.get('/health', async (ctx: Context) => {
    try {
        const stats = await getIndexStats()
        ctx.body = {
        status: 'green',
        db_connected: true,
        product_count: stats.total_documents,
        index_size: stats.index_size_human,
        uptime_seconds: Math.floor(process.uptime()),
        version: '1.0.0',
        }
    } catch (err) {
        ctx.status = 503
        ctx.body = {
        status: 'red',
        db_connected: false,
        uptime_seconds: Math.floor(process.uptime()),
        version: '1.0.0',
        }
    }
    })

    router.get('/stats', async (ctx: Context) => {
    const stats = await getIndexStats()
    ctx.body = { index: 'products', ...stats }
    })

    router.get('/search', validate(searchSchema, 'query'), async (ctx: Context) => {
    const results = await searchProducts(ctx.state.validated)
    ctx.body = results
    })

    router.get('/facets', validate(searchSchema, 'query'), async (ctx: Context) => {
    const facets = await getFacets(ctx.state.validated)
    ctx.body = facets
    })

    router.get('/suggest', validate(suggestSchema, 'query'), async (ctx: Context) => {
    const { q, limit } = ctx.state.validated
    ctx.body = await getSuggestions(q, limit)
    })

    router.get('/products/:id', async (ctx: Context) => {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT * FROM products WHERE id = ${ctx.params.id} LIMIT 1
    `
    if (!rows.length) {
        ctx.status = 404
        ctx.body = { error: 'Product not found', status: 404 }
        return
    }
    ctx.body = rows[0]
    })

    router.get('/products', validate(searchSchema, 'query'), async (ctx: Context) => {
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
    })

    export default router