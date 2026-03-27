

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
    import { health,stats,search, facets, suggest, products, productsId } from '../controllers'

    const router = new Router({ prefix: '/api' })

    router.get('/health',health)

    router.get('/stats',stats)

    router.get('/search', validate(searchSchema, 'query'),search)

    router.get('/facets', validate(searchSchema, 'query'), facets)

    router.get('/suggest', validate(suggestSchema, 'query'), suggest)

    router.get('/products/:id', productsId)

    router.get('/products', validate(searchSchema, 'query'), products)

    export default router