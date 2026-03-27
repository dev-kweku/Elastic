

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
    import { health,stats } from '../controllers'

    const router = new Router({ prefix: '/api' })

    router.get('/health',health)

    router.get('/stats',stats)

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