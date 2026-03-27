
    import prisma from '../db'
    import type {
        SearchParams,
        SearchResponse,
        SearchHit,
        FacetsResponse,
        FacetBucket,
        SuggestResponse,
        SuggestionItem,
    } from '../types'


    function buildTsQuery(q: string): string {
        return q
        .trim()
        .replace(/[^a-zA-Z0-9\s\-]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word + ':*')   
        .join(' & ')
    }


    function buildOrderBy(sort?: string, hasQuery?: boolean): string {
        switch (sort) {
        case 'price_asc':   return 'p.price ASC'
        case 'price_desc':  return 'p.price DESC'
        case 'rating':      return 'p.rating DESC, p.review_count DESC'
        case 'newest':      return 'p.created_at DESC'
        case 'popularity':  return 'p.review_count DESC, p.rating DESC'
        case 'relevance':
        default:

        return hasQuery
            ? 'score DESC NULLS LAST, p.rating DESC'
            : '(p.rating * LOG(GREATEST(p.review_count, 1) + 1)) DESC'
    }
    }



    export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
    const start = Date.now()

    const {
        q,
        category,
        brand,
        min_price,
        max_price,
        in_stock,
        min_rating,
        tags,
        sort = 'relevance',
        page = 1,
        limit = 20,
    } = params

    const offset = (page - 1) * limit
    const safeLimit = Math.min(limit, 100)

    
    const conditions: string[] = ['1=1']
    const sqlParams: unknown[] = []
    let paramIdx = 1

    
    let tsQueryExpr = 'NULL'
    let scoreExpr = '0::float'

    if (q && q.trim().length > 0) {
        const tsQuery = buildTsQuery(q)
        sqlParams.push(tsQuery)
        const qIdx = paramIdx++

        conditions.push(`p.search_vector @@ to_tsquery('english', $${qIdx})`)

        
        tsQueryExpr = `to_tsquery('english', $${qIdx})`
        scoreExpr = `ts_rank_cd(ARRAY[0.1, 0.2, 0.4, 1.0], p.search_vector, to_tsquery('english', $${qIdx}), 32)`
    }


    if (category) {
        sqlParams.push(category)
        conditions.push(`LOWER(p.category) = LOWER($${paramIdx++})`)
    }

    if (brand) {
        sqlParams.push(brand)
        conditions.push(`LOWER(p.brand) = LOWER($${paramIdx++})`)
    }

    
    if (min_price !== undefined) {
        sqlParams.push(min_price)
        conditions.push(`p.price >= $${paramIdx++}`)
    }

    if (max_price !== undefined) {
        sqlParams.push(max_price)
        conditions.push(`p.price <= $${paramIdx++}`)
    }

    if (min_rating !== undefined) {
        sqlParams.push(min_rating)
        conditions.push(`p.rating >= $${paramIdx++}`)
    }

    if (in_stock !== undefined) {
        sqlParams.push(in_stock)
        conditions.push(`p.in_stock = $${paramIdx++}`)
    }

    
    if (tags && tags.length > 0) {
        sqlParams.push(tags)
        conditions.push(`p.tags && $${paramIdx++}::text[]`)
    }

    const whereClause = conditions.join(' AND ')
    const orderClause = buildOrderBy(sort, !!(q && q.trim()))


    const dataQuery = `
        SELECT
        p.id,
        p.sku,
        p.name,
        p.description,
        p.category,
        p.subcategory,
        p.brand,
        p.price,
        p.original_price,
        p.in_stock,
        p.stock_qty,
        p.rating,
        p.review_count,
        p.tags,
        p.image_url,
        p.created_at,
        p.updated_at,
        ${scoreExpr} AS score
        FROM products p
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT ${safeLimit}
        OFFSET ${offset}
    `

    
    const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        WHERE ${whereClause}
    `

    const [rows, countResult] = await Promise.all([
        prisma.$queryRawUnsafe(dataQuery, ...sqlParams) as Promise<SearchHit[]>,
        prisma.$queryRawUnsafe(countQuery, ...sqlParams) as Promise<[{ total: bigint }]>,
    ])

    const total = Number(countResult[0]?.total ?? 0)

    return {
        hits: rows.map(r => ({
        ...r,
        score: r.score ? Number(r.score) : null,
        })),
        total,
        page,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit),
        took_ms: Date.now() - start,
        query: q || null,
    }
    }


    export async function getFacets(params: Pick<SearchParams, 'q' | 'category' | 'brand' | 'min_price' | 'max_price' | 'in_stock' | 'tags'>): Promise<FacetsResponse> {
    const start = Date.now()

    
    const categoryFacets = await prisma.$queryRaw<FacetBucket[]>`
        SELECT category AS value, COUNT(*)::int AS count
        FROM products
        GROUP BY category
        ORDER BY count DESC
    `

    
    const brandFacets = await prisma.$queryRaw<FacetBucket[]>`
        SELECT brand AS value, COUNT(*)::int AS count
        FROM products
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 20
    `

    
    const priceRangeFacets = await prisma.$queryRaw<Array<{range: string, min: number, max: number, count: number}>>`
        SELECT
        CASE
            WHEN price < 25    THEN 'Under $25'
            WHEN price < 50    THEN '$25 – $50'
            WHEN price < 100   THEN '$50 – $100'
            WHEN price < 250   THEN '$100 – $250'
            WHEN price < 500   THEN '$250 – $500'
            WHEN price < 1000  THEN '$500 – $1,000'
            ELSE 'Over $1,000'
        END AS range,
        MIN(price)::float    AS min,
        MAX(price)::float    AS max,
        COUNT(*)::int        AS count
        FROM products
        GROUP BY range
        ORDER BY min ASC
    `

    const tagFacets = await prisma.$queryRaw<FacetBucket[]>`
        SELECT unnest(tags) AS value, COUNT(*)::int AS count
        FROM products
        GROUP BY value
        ORDER BY count DESC
        LIMIT 20
    `

    const ratingDist = await prisma.$queryRaw<FacetBucket[]>`
        SELECT
        FLOOR(rating)::text AS value,
        COUNT(*)::int        AS count
        FROM products
        GROUP BY value
        ORDER BY value DESC
    `

    const summary = await prisma.$queryRaw<Array<{total: bigint, in_stock: bigint}>>`
        SELECT COUNT(*) AS total, SUM(CASE WHEN in_stock THEN 1 ELSE 0 END) AS in_stock
        FROM products
    `

    return {
        categories: categoryFacets,
        brands: brandFacets,
        price_ranges: priceRangeFacets,
        tags: tagFacets,
        rating_distribution: ratingDist,
        total_products: Number(summary[0]?.total ?? 0),
        in_stock_count: Number(summary[0]?.in_stock ?? 0),
        took_ms: Date.now() - start,
    }
    }


    export async function getSuggestions(prefix: string, limit = 8): Promise<SuggestResponse> {
    const start = Date.now()

    if (!prefix || prefix.trim().length < 2) {
        return { suggestions: [], took_ms: Date.now() - start }
    }

    const safe = prefix.trim().toLowerCase()

    const productSuggestions = await prisma.$queryRaw<Array<{id: string, text: string, score: number}>>`
        SELECT
        id,
        name AS text,
        (rating * LOG(GREATEST(review_count, 1) + 1))::float AS score
        FROM products
        WHERE LOWER(name) ILIKE ${safe + '%'}
        ORDER BY score DESC
        LIMIT ${Math.ceil(limit / 2)}
    `

    const categorySuggestions = await prisma.$queryRaw<Array<{text: string, count: number}>>`
        SELECT category AS text, COUNT(*)::int AS count
        FROM products
        WHERE LOWER(category) ILIKE ${safe + '%'}
        GROUP BY category
        ORDER BY count DESC
        LIMIT 3
    `

    const brandSuggestions = await prisma.$queryRaw<Array<{text: string, count: number}>>`
        SELECT brand AS text, COUNT(*)::int AS count
        FROM products
        WHERE LOWER(brand) ILIKE ${safe + '%'}
        GROUP BY brand
        ORDER BY count DESC
        LIMIT 3
    `

    const suggestions: SuggestionItem[] = [
        ...(productSuggestions as Array<{id: string; text: string; score: number}>).map(r => ({
        text: r.text,
        type: 'product' as const,
        id: r.id,
        score: Number(r.score),
        })),
        ...(categorySuggestions as Array<{text: string; count: number}>).map(r => ({
        text: r.text,
        type: 'category' as const,
        score: Number(r.count) * 10,
        })),
        ...(brandSuggestions as Array<{text: string; count: number}>).map(r => ({
        text: r.text,
        type: 'brand' as const,
        score: Number(r.count) * 8,
        })),
    ]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    return {
        suggestions,
        took_ms: Date.now() - start,
    }
    }


    export async function getIndexStats() {
    const stats = await prisma.$queryRaw`
        SELECT
        COUNT(*)                                              AS total,
        SUM(CASE WHEN in_stock THEN 1 ELSE 0 END)            AS in_stock,
        AVG(price)::float                                     AS avg_price,
        AVG(rating)::float                                    AS avg_rating,
        COUNT(DISTINCT category)                              AS categories,
        COUNT(DISTINCT brand)                                 AS brands,
        pg_total_relation_size('products')                    AS size_bytes
        FROM products
    ` as Array<{
        total: bigint
        in_stock: bigint
        avg_price: number
        avg_rating: number
        categories: bigint
        brands: bigint
        size_bytes: bigint
    }>

    const row = stats[0]
    return {
        total_documents: Number(row?.total ?? 0),
        in_stock_documents: Number(row?.in_stock ?? 0),
        avg_price: Number(row?.avg_price ?? 0),
        avg_rating: Number(row?.avg_rating ?? 0),
        unique_categories: Number(row?.categories ?? 0),
        unique_brands: Number(row?.brands ?? 0),
        index_size_bytes: Number(row?.size_bytes ?? 0),
        index_size_human: formatBytes(Number(row?.size_bytes ?? 0)),
    }
    }

    function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`
    }