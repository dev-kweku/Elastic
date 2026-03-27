
    import { Pool } from 'pg'

    const THRESHOLDS = {
    SIMPLE_SEARCH:    150,
    FILTERED_SEARCH:  200,
    COMPLEX_SEARCH:   300,
    FACETS:           400,
    AUTOCOMPLETE:     100,
    COLD_QUERY:       500,
    }

    let pool: Pool


    function buildTsQuery(q: string): string {
    return q
        .trim()
        .replace(/[^a-zA-Z0-9\s\-]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word + ':*')
        .join(' & ')
    }

    interface SearchParams {
    q?: string
    category?: string
    brand?: string
    min_price?: number
    max_price?: number
    in_stock?: boolean
    min_rating?: number
    tags?: string[]
    sort?: string
    page?: number
    limit?: number
    }

    interface SearchResult {
    hits: any[]
    total: number
    page: number
    limit: number
    total_pages: number
    took_ms: number
    query: string | null
    }

    async function searchProducts(params: SearchParams): Promise<SearchResult> {
    const start = Date.now()
    const { q, category, brand, min_price, max_price, in_stock, min_rating, tags, sort = 'relevance', page = 1, limit = 20 } = params
    const safeLimit = Math.min(limit, 100)
    const offset = (page - 1) * safeLimit

    const conditions: string[] = ['1=1']
    const sqlParams: any[] = []
    let paramIdx = 1
    let scoreExpr = '0::float'

    if (q && q.trim().length > 0) {
        const tsQuery = buildTsQuery(q)
        sqlParams.push(tsQuery)
        const qIdx = paramIdx++
        conditions.push(`p.search_vector @@ to_tsquery('english', $${qIdx})`)
        scoreExpr = `ts_rank_cd(ARRAY[0.1, 0.2, 0.4, 1.0], p.search_vector, to_tsquery('english', $${qIdx}), 32)`
    }

    if (category) { sqlParams.push(category); conditions.push(`LOWER(p.category) = LOWER($${paramIdx++})`) }
    if (brand)    { sqlParams.push(brand);    conditions.push(`LOWER(p.brand) = LOWER($${paramIdx++})`) }
    if (min_price !== undefined) { sqlParams.push(min_price); conditions.push(`p.price >= $${paramIdx++}`) }
    if (max_price !== undefined) { sqlParams.push(max_price); conditions.push(`p.price <= $${paramIdx++}`) }
    if (min_rating !== undefined) { sqlParams.push(min_rating); conditions.push(`p.rating >= $${paramIdx++}`) }
    if (in_stock !== undefined) { sqlParams.push(in_stock); conditions.push(`p.in_stock = $${paramIdx++}`) }
    if (tags && tags.length > 0) { sqlParams.push(tags); conditions.push(`p.tags && $${paramIdx++}::text[]`) }

    const whereClause = conditions.join(' AND ')

    let orderClause: string
    switch (sort) {
        case 'price_asc':  orderClause = 'p.price ASC'; break
        case 'price_desc': orderClause = 'p.price DESC'; break
        case 'rating':     orderClause = 'p.rating DESC, p.review_count DESC'; break
        case 'newest':     orderClause = 'p.created_at DESC'; break
        case 'popularity': orderClause = 'p.review_count DESC, p.rating DESC'; break
        default:           orderClause = q ? 'score DESC NULLS LAST, p.rating DESC' : '(p.rating * LOG(GREATEST(p.review_count, 1) + 1)) DESC'
    }

    const dataQuery = `
        SELECT p.id, p.sku, p.name, p.description, p.category, p.subcategory,
            p.brand, p.price, p.original_price, p.in_stock, p.stock_qty,
            p.rating, p.review_count, p.tags, p.image_url, p.created_at,
            p.updated_at, ${scoreExpr} AS score
        FROM products p
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT ${safeLimit} OFFSET ${offset}
    `
    const countQuery = `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`

    const [dataRes, countRes] = await Promise.all([
        pool.query(dataQuery, sqlParams),
        pool.query(countQuery, sqlParams),
    ])

    const total = parseInt(countRes.rows[0].total, 10)
    return {
        hits: dataRes.rows,
        total,
        page,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit),
        took_ms: Date.now() - start,
        query: q || null,
    }
    }

    async function getFacets(): Promise<any> {
    const start = Date.now()
    const [cats, brands, prices, tags, ratings, summary] = await Promise.all([
        pool.query(`SELECT category AS value, COUNT(*)::int AS count FROM products GROUP BY category ORDER BY count DESC`),
        pool.query(`SELECT brand AS value, COUNT(*)::int AS count FROM products GROUP BY brand ORDER BY count DESC LIMIT 20`),
        pool.query(`
        SELECT CASE
            WHEN price < 25   THEN 'Under $25'
            WHEN price < 50   THEN '$25  $50'
            WHEN price < 100  THEN '$50  $100'
            WHEN price < 250  THEN '$100  $250'
            WHEN price < 500  THEN '$250  $500'
            WHEN price < 1000 THEN '$500  $1,000'
            ELSE 'Over $1,000'
        END AS range, MIN(price)::float AS min, MAX(price)::float AS max, COUNT(*)::int AS count
        FROM products GROUP BY range ORDER BY min ASC`),
        pool.query(`SELECT unnest(tags) AS value, COUNT(*)::int AS count FROM products GROUP BY value ORDER BY count DESC LIMIT 20`),
        pool.query(`SELECT FLOOR(rating)::text AS value, COUNT(*)::int AS count FROM products GROUP BY value ORDER BY value DESC`),
        pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN in_stock THEN 1 ELSE 0 END) AS in_stock FROM products`),
    ])
    return {
        categories: cats.rows,
        brands: brands.rows,
        price_ranges: prices.rows,
        tags: tags.rows,
        rating_distribution: ratings.rows,
        total_products: parseInt(summary.rows[0].total, 10),
        in_stock_count: parseInt(summary.rows[0].in_stock, 10),
        took_ms: Date.now() - start,
    }
    }

    async function getSuggestions(prefix: string, limit = 8): Promise<any> {
    const start = Date.now()
    if (!prefix || prefix.trim().length < 2) return { suggestions: [], took_ms: Date.now() - start }
    const safe = prefix.trim().toLowerCase() + '%'
    const [prods, cats, brnds] = await Promise.all([
        pool.query(`SELECT id, name AS text, (rating * LOG(GREATEST(review_count, 1) + 1))::float AS score FROM products WHERE LOWER(name) ILIKE $1 ORDER BY score DESC LIMIT $2`, [safe, Math.ceil(limit / 2)]),
        pool.query(`SELECT category AS text, COUNT(*)::int AS count FROM products WHERE LOWER(category) ILIKE $1 GROUP BY category ORDER BY count DESC LIMIT 3`, [safe]),
        pool.query(`SELECT brand AS text, COUNT(*)::int AS count FROM products WHERE LOWER(brand) ILIKE $1 GROUP BY brand ORDER BY count DESC LIMIT 3`, [safe]),
    ])
    const suggestions = [
        ...prods.rows.map((r: any) => ({ text: r.text, type: 'product', id: r.id, score: Number(r.score) })),
        ...cats.rows.map((r: any) => ({ text: r.text, type: 'category', score: Number(r.count) * 10 })),
        ...brnds.rows.map((r: any) => ({ text: r.text, type: 'brand', score: Number(r.count) * 8 })),
    ].sort((a, b) => b.score - a.score).slice(0, limit)
    return { suggestions, took_ms: Date.now() - start }
    }

    async function getIndexStats(): Promise<any> {
    const res = await pool.query(`
        SELECT COUNT(*) AS total,
            SUM(CASE WHEN in_stock THEN 1 ELSE 0 END) AS in_stock,
            AVG(price)::float AS avg_price,
            AVG(rating)::float AS avg_rating,
            COUNT(DISTINCT category) AS categories,
            COUNT(DISTINCT brand) AS brands,
            pg_total_relation_size('products') AS size_bytes
        FROM products
    `)
    const r = res.rows[0]
    const bytes = parseInt(r.size_bytes, 10)
    return {
        total_documents:    parseInt(r.total, 10),
        in_stock_documents: parseInt(r.in_stock, 10),
        avg_price:          Number(r.avg_price),
        avg_rating:         Number(r.avg_rating),
        unique_categories:  parseInt(r.categories, 10),
        unique_brands:      parseInt(r.brands, 10),
        index_size_bytes:   bytes,
        index_size_human:   bytes < 1048576 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1048576).toFixed(1)} MB`,
    }
    }


    beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const res = await pool.query('SELECT COUNT(*) AS count FROM products')
    const count = parseInt(res.rows[0].count, 10)
    if (count === 0) throw new Error('Database is empty. Run: pnpm db:seed')
    console.log(`\n🗄  Test DB: ${count} products indexed\n`)
    })

    afterAll(async () => {
    await pool.end()
    })


    describe('Search Accuracy', () => {

    test('keyword search returns relevant results', async () => {
        const result = await searchProducts({ q: 'wireless headphones' })
        expect(result.hits.length).toBeGreaterThan(0)
        expect(result.total).toBeGreaterThan(0)
        const relevant = result.hits.filter((h: any) =>
        h.name.toLowerCase().includes('wireless') ||
        h.name.toLowerCase().includes('headphone') ||
        h.description.toLowerCase().includes('wireless') ||
        h.tags.some((t: string) => t.toLowerCase().includes('wireless'))
        )
        expect(relevant.length).toBeGreaterThan(0)
    })

    test('category filter returns only that category', async () => {
        const result = await searchProducts({ category: 'Electronics', limit: 50 })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => expect(h.category.toLowerCase()).toBe('electronics'))
    })

    test('brand filter returns only that brand', async () => {
        const result = await searchProducts({ brand: 'Sony' })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => expect(h.brand.toLowerCase()).toBe('sony'))
    })

    test('price range filter returns products within range', async () => {
        const result = await searchProducts({ min_price: 50, max_price: 200, limit: 50 })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => {
        expect(Number(h.price)).toBeGreaterThanOrEqual(50)
        expect(Number(h.price)).toBeLessThanOrEqual(200)
        })
    })

    test('in_stock filter returns only in-stock products', async () => {
        const result = await searchProducts({ in_stock: true, limit: 50 })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => expect(h.in_stock).toBe(true))
    })

    test('rating filter returns products at or above minimum', async () => {
        const result = await searchProducts({ min_rating: 4.0, limit: 50 })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => expect(Number(h.rating)).toBeGreaterThanOrEqual(4.0))
    })

    test('combined filters narrow results accurately', async () => {
        const result = await searchProducts({ category: 'Electronics', min_price: 100, max_price: 1000, in_stock: true, min_rating: 3.0, limit: 50 })
        result.hits.forEach((h: any) => {
        expect(h.category.toLowerCase()).toBe('electronics')
        expect(Number(h.price)).toBeGreaterThanOrEqual(100)
        expect(Number(h.price)).toBeLessThanOrEqual(1000)
        expect(h.in_stock).toBe(true)
        expect(Number(h.rating)).toBeGreaterThanOrEqual(3.0)
        })
    })

    test('tags filter returns products with matching tags', async () => {
        const result = await searchProducts({ tags: ['wireless'], limit: 30 })
        expect(result.hits.length).toBeGreaterThan(0)
        result.hits.forEach((h: any) => expect(h.tags).toContain('wireless'))
    })
    })


    describe('Relevance & Scoring', () => {

    test('results have a relevance score when query is provided', async () => {
        const result = await searchProducts({ q: 'laptop' })
        expect(result.hits.length).toBeGreaterThan(0)
        const scored = result.hits.slice(0, 5).filter((h: any) => Number(h.score) > 0)
        expect(scored.length).toBeGreaterThan(0)
    })

    test('results sorted by relevance score DESC', async () => {
        const result = await searchProducts({ q: 'camera', sort: 'relevance' })
        const scores = result.hits.filter((h: any) => Number(h.score) > 0).map((h: any) => Number(h.score))
        for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1] + 0.001)
        }
    })

    test('price_asc sort returns correctly ordered results', async () => {
        const result = await searchProducts({ sort: 'price_asc', limit: 20 })
        const prices = result.hits.map((h: any) => Number(h.price))
        for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    })

    test('price_desc sort returns correctly ordered results', async () => {
        const result = await searchProducts({ sort: 'price_desc', limit: 20 })
        const prices = result.hits.map((h: any) => Number(h.price))
        for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeLessThanOrEqual(prices[i - 1])
    })

    test('rating sort returns highest rated first', async () => {
        const result = await searchProducts({ sort: 'rating', limit: 20 })
        const ratings = result.hits.map((h: any) => Number(h.rating))
        for (let i = 1; i < ratings.length; i++) expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1] + 0.05)
    })

    test('newest sort returns most recently added products first', async () => {
        const result = await searchProducts({ sort: 'newest', limit: 10 })
        const dates = result.hits.map((h: any) => new Date(h.created_at).getTime())
        for (let i = 1; i < dates.length; i++) expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
    })
    })


    describe('Query Speed Benchmarks', () => {

    test(`simple keyword search completes under ${THRESHOLDS.SIMPLE_SEARCH}ms`, async () => {
        const result = await searchProducts({ q: 'wireless' })
        console.log(`      Simple search: ${result.took_ms}ms`)
        expect(result.took_ms).toBeLessThan(THRESHOLDS.SIMPLE_SEARCH)
    })

    test(`category filter search completes under ${THRESHOLDS.FILTERED_SEARCH}ms`, async () => {
        const result = await searchProducts({ category: 'Electronics' })
        console.log(`      Category filter: ${result.took_ms}ms`)
        expect(result.took_ms).toBeLessThan(THRESHOLDS.FILTERED_SEARCH)
    })

    test(`full-text + multi-filter search completes under ${THRESHOLDS.COMPLEX_SEARCH}ms`, async () => {
        const result = await searchProducts({ q: 'portable lightweight', category: 'Sports & Outdoors', min_price: 20, max_price: 500, in_stock: true, min_rating: 3.5, sort: 'relevance' })
        console.log(`      Complex search: ${result.took_ms}ms`)
        expect(result.took_ms).toBeLessThan(THRESHOLDS.COMPLEX_SEARCH)
    })

    test(`facet aggregations complete under ${THRESHOLDS.FACETS}ms`, async () => {
        const facets = await getFacets()
        console.log(`      Facets: ${facets.took_ms}ms`)
        expect(facets.took_ms).toBeLessThan(THRESHOLDS.FACETS)
    })

    test(`autocomplete suggestion completes under ${THRESHOLDS.AUTOCOMPLETE}ms`, async () => {
        const result = await getSuggestions('Sony', 8)
        console.log(`      Suggest: ${result.took_ms}ms`)
        expect(result.took_ms).toBeLessThan(THRESHOLDS.AUTOCOMPLETE)
    })

    test('concurrent search requests all complete within 2x threshold', async () => {
        const start = Date.now()
        const results = await Promise.all([
        searchProducts({ q: 'laptop' }),
        searchProducts({ q: 'running shoes', category: 'Sports & Outdoors' }),
        searchProducts({ sort: 'price_asc', max_price: 100 }),
        searchProducts({ q: 'camera', sort: 'rating' }),
        searchProducts({ category: 'Books', min_rating: 4.0 }),
        ])
        const wall = Date.now() - start
        results.forEach((r, i) => console.log(`      Query ${i + 1}: ${r.took_ms}ms`))
        console.log(`      Total wall: ${wall}ms`)
        expect(wall).toBeLessThan(THRESHOLDS.COMPLEX_SEARCH * 2)
    })

    test('warm query is within cold query threshold', async () => {
        const r1 = await searchProducts({ q: 'organic natural', category: 'Beauty & Health' })
        const r2 = await searchProducts({ q: 'organic natural', category: 'Beauty & Health' })
        console.log(`      Cold: ${r1.took_ms}ms | Warm: ${r2.took_ms}ms`)
        expect(r2.took_ms).toBeLessThan(THRESHOLDS.COLD_QUERY)
    })
    })


    describe('Facets (Aggregations)', () => {

    test('returns all expected facet groups', async () => {
        const facets = await getFacets()
        expect(facets).toHaveProperty('categories')
        expect(facets).toHaveProperty('brands')
        expect(facets).toHaveProperty('price_ranges')
        expect(facets).toHaveProperty('tags')
        expect(facets).toHaveProperty('rating_distribution')
        expect(facets).toHaveProperty('total_products')
        expect(facets).toHaveProperty('in_stock_count')
    })

    test('category facets cover all 8 categories', async () => {
        const facets = await getFacets()
        expect(facets.categories.length).toBe(8)
    })

    test('category facet counts sum to total products', async () => {
        const facets = await getFacets()
        const sum = facets.categories.reduce((acc: number, c: any) => acc + c.count, 0)
        expect(sum).toBe(facets.total_products)
    })

    test('price range facets are ordered low to high', async () => {
        const facets = await getFacets()
        const mins = facets.price_ranges.map((p: any) => p.min)
        for (let i = 1; i < mins.length; i++) expect(mins[i]).toBeGreaterThan(mins[i - 1])
    })

    test('price range counts sum to total products', async () => {
        const facets = await getFacets()
        const sum = facets.price_ranges.reduce((acc: number, p: any) => acc + p.count, 0)
        expect(sum).toBe(facets.total_products)
    })

    test('in_stock_count is <= total_products', async () => {
        const facets = await getFacets()
        expect(facets.in_stock_count).toBeLessThanOrEqual(facets.total_products)
        expect(facets.in_stock_count).toBeGreaterThan(0)
    })

    test('tags facet returns tags with counts', async () => {
        const facets = await getFacets()
        expect(facets.tags.length).toBeGreaterThan(0)
        facets.tags.forEach((t: any) => {
        expect(t).toHaveProperty('value')
        expect(t).toHaveProperty('count')
        expect(t.count).toBeGreaterThan(0)
        })
    })

    test('rating distribution counts sum to total products', async () => {
        const facets = await getFacets()
        const total = facets.rating_distribution.reduce((acc: number, r: any) => acc + r.count, 0)
        expect(total).toBe(facets.total_products)
    })
    })


    describe('Autocomplete / Suggest', () => {

    test('returns suggestions for valid prefix', async () => {
        const result = await getSuggestions('Son')
        expect(result.suggestions.length).toBeGreaterThan(0)
    })

    test('suggestions have required fields', async () => {
        const result = await getSuggestions('App')
        result.suggestions.forEach((s: any) => {
        expect(s).toHaveProperty('text')
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('score')
        expect(['product', 'category', 'brand']).toContain(s.type)
        })
    })

    test('empty prefix returns empty suggestions', async () => {
        const result = await getSuggestions('')
        expect(result.suggestions).toHaveLength(0)
    })

    test('single char prefix returns empty suggestions', async () => {
        const result = await getSuggestions('A')
        expect(result.suggestions).toHaveLength(0)
    })

    test('respects limit parameter', async () => {
        const result = await getSuggestions('a', 4)
        expect(result.suggestions.length).toBeLessThanOrEqual(4)
    })

    test('suggestions are sorted by score descending', async () => {
        const result = await getSuggestions('apple')
        const scores = result.suggestions.map((s: any) => s.score)
        for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    })
    })


    describe('Pagination', () => {

    test('first page returns correct number of results', async () => {
        const result = await searchProducts({ page: 1, limit: 10 })
        expect(result.hits.length).toBeLessThanOrEqual(10)
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
    })

    test('total_pages is calculated correctly', async () => {
        const result = await searchProducts({ limit: 10 })
        expect(result.total_pages).toBe(Math.ceil(result.total / 10))
    })

    test('page 2 returns different results than page 1', async () => {
        const p1 = await searchProducts({ page: 1, limit: 10 })
        const p2 = await searchProducts({ page: 2, limit: 10 })
        const p1Ids = new Set(p1.hits.map((h: any) => h.id))
        const overlap = p2.hits.filter((h: any) => p1Ids.has(h.id))
        expect(overlap.length).toBe(0)
    })

    test('page beyond total returns empty hits', async () => {
        const result = await searchProducts({ page: 9999, limit: 20 })
        expect(result.hits.length).toBe(0)
        expect(result.total).toBeGreaterThan(0)
    })

    test('limit is capped at 100', async () => {
        const result = await searchProducts({ limit: 999 })
        expect(result.hits.length).toBeLessThanOrEqual(100)
    })
    })


    describe('Edge Cases', () => {

    test('empty search returns all products', async () => {
        const result = await searchProducts({})
        expect(result.total).toBeGreaterThan(0)
        expect(result.hits.length).toBeGreaterThan(0)
    })

    test('search with special characters does not crash', async () => {
        const queries = ["it's a test", "100% off", "price & brand", 'say hello']
        for (const q of queries) {
        const result = await searchProducts({ q })
        expect(result).toHaveProperty('hits')
        expect(result).toHaveProperty('total')
        }
    })

    test('very long query string is handled gracefully', async () => {
        const longQuery = 'wireless bluetooth headphones noise canceling premium '.repeat(10)
        const result = await searchProducts({ q: longQuery })
        expect(result).toHaveProperty('hits')
    })

    test('nonexistent category returns empty results', async () => {
        const result = await searchProducts({ category: 'NonExistentCategory12345' })
        expect(result.total).toBe(0)
        expect(result.hits).toHaveLength(0)
    })

    test('impossible price range returns empty results', async () => {
        const result = await searchProducts({ min_price: 10000, max_price: 10001 })
        expect(result.total).toBe(0)
    })

    test('response always contains required fields', async () => {
        const result = await searchProducts({ q: 'test' })
        expect(result).toHaveProperty('hits')
        expect(result).toHaveProperty('total')
        expect(result).toHaveProperty('page')
        expect(result).toHaveProperty('limit')
        expect(result).toHaveProperty('total_pages')
        expect(result).toHaveProperty('took_ms')
        expect(result).toHaveProperty('query')
    })
    })


    describe('Index Stats', () => {

    test('returns all stat fields', async () => {
        const stats = await getIndexStats()
        expect(stats).toHaveProperty('total_documents')
        expect(stats).toHaveProperty('in_stock_documents')
        expect(stats).toHaveProperty('avg_price')
        expect(stats).toHaveProperty('avg_rating')
        expect(stats).toHaveProperty('unique_categories')
        expect(stats).toHaveProperty('unique_brands')
        expect(stats).toHaveProperty('index_size_bytes')
        expect(stats).toHaveProperty('index_size_human')
    })

    test('total_documents matches seeded count', async () => {
        const stats = await getIndexStats()
        expect(stats.total_documents).toBe(500)
    })

    test('avg_price is within expected range', async () => {
        const stats = await getIndexStats()
        expect(stats.avg_price).toBeGreaterThan(0)
        expect(stats.avg_price).toBeLessThan(5000)
    })

    test('avg_rating is between 0 and 5', async () => {
        const stats = await getIndexStats()
        expect(stats.avg_rating).toBeGreaterThan(0)
        expect(stats.avg_rating).toBeLessThanOrEqual(5)
    })

    test('unique_categories is 8', async () => {
        const stats = await getIndexStats()
        expect(stats.unique_categories).toBe(8)
    })
    })