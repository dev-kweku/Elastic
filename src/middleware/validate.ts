
    import { Context, Next } from 'koa'
    import { z, ZodType, ZodError } from 'zod'
    // import bodyParser from 'koa-bodyparser'

    export function validate(schema: ZodType, source: 'query' | 'body' = 'query') {
    return async (ctx: Context, next: Next) => {
        try {
        const data = source === 'query' ? ctx.query : ctx.request.body
        ctx.state.validated = schema.parse(data)
        await next()
        } catch (err:unknown) {
        if (err instanceof ZodError) {
            ctx.status = 400
            ctx.body = {
            error: 'Validation failed',
            details: err.issues.map((e: { path: any[]; message: any }) => `${e.path.join('.')}: ${e.message}`).join('; '),
            status: 400,
            }
            return
        }
        throw err
        }
    }
    }

    

    export const searchSchema = z.object({
    q:          z.string().max(200).optional(),
    category:   z.string().max(100).optional(),
    brand:      z.string().max(100).optional(),
    min_price:  z.coerce.number().min(0).optional(),
    max_price:  z.coerce.number().min(0).optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    in_stock:   z.enum(['true', 'false']).transform(v => v === 'true').optional(),
    tags:       z.union([
                    z.string().transform(v => v.split(',')),
                    z.array(z.string())
                ]).optional(),
    sort:       z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'popularity']).optional(),
    page:       z.coerce.number().int().min(1).max(1000).default(1),
    limit:      z.coerce.number().int().min(1).max(100).default(20),
    })

    export const suggestSchema = z.object({
    q:     z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(20).default(8),
    })

    export type SearchSchemaType = z.infer<typeof searchSchema>
    export type SuggestSchemaType = z.infer<typeof suggestSchema>