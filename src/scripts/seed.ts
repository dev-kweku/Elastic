
    import { PrismaClient } from '../generated/prisma/client'
    import { PrismaPg } from '@prisma/adapter-pg'
    import * as fs from 'fs'
    import * as path from 'path'
    import * as dotenv from 'dotenv'

    dotenv.config()

    function createClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error(' DATABASE_URL is not set. Check your .env file.')
        process.exit(1)
    }
    const adapter = new PrismaPg({ connectionString })
    return new PrismaClient({ adapter } as any)
    }

    const prisma = createClient()

    interface RawProduct {
    id: string
    sku: string
    name: string
    description: string
    category: string
    subcategory: string
    brand: string
    price: number
    original_price: number | null
    currency: string
    stock_qty: number
    in_stock: boolean
    rating: number
    review_count: number
    tags: string[]
    image_url: string
    created_at: string
    updated_at: string
    }


    async function ensureTriggerAndIndex() {
    console.log(' Ensuring tsvector trigger and GIN index exist...')


    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION products_search_vector_update()
        RETURNS TRIGGER AS $$
        BEGIN
        NEW.search_vector :=
            setweight(to_tsvector('english', coalesce(NEW.name, '')),        'A') ||
            setweight(to_tsvector('english', coalesce(NEW.brand, '')),       'A') ||
            setweight(to_tsvector('english', coalesce(NEW.subcategory, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
            setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'D');
        RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `)


    await prisma.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
    `)
    await prisma.$executeRawUnsafe(`
        CREATE TRIGGER products_search_vector_trigger
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();
    `)


    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS products_search_vector_gin
        ON products USING GIN(search_vector);
    `)


    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS products_tags_gin
        ON products USING GIN(tags);
    `)

    console.log('  Trigger and GIN indexes ready\n')
    }


    async function backfillSearchVectors() {
    console.log('🔄 Backfilling search_vector for all rows...')

    const result = await prisma.$executeRawUnsafe(`
        UPDATE products
        SET search_vector =
        setweight(to_tsvector('english', coalesce(name, '')),        'A') ||
        setweight(to_tsvector('english', coalesce(brand, '')),       'A') ||
        setweight(to_tsvector('english', coalesce(subcategory, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D')
        WHERE search_vector IS NULL
    `)

    console.log(` Backfilled ${result} rows\n`)
    }

    async function seed() {
    console.log(' Starting database seed...\n')

    await ensureTriggerAndIndex()

    const dataPath = path.join(__dirname, 'products.json')

    if (!fs.existsSync(dataPath)) {
        console.error(' products.json not found. Run: pnpm generate:data')
        process.exit(1)
    }

    const products: RawProduct[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    console.log(` Loaded ${products.length} products from products.json`)


    await prisma.products.deleteMany()
    console.log('  Cleared existing products\n')


    const BATCH_SIZE = 50
    let inserted = 0
    const start = Date.now()

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE)

        await prisma.$transaction(
        batch.map(p =>
            prisma.products.create({
            data: {
                id:             p.id,
                sku:            p.sku,
                name:           p.name,
                description:    p.description,
                category:       p.category,
                subcategory:    p.subcategory,
                brand:          p.brand,
                price:          p.price,
                original_price: p.original_price,
                currency:       p.currency,
                stock_qty:      p.stock_qty,
                in_stock:       p.in_stock,
                rating:         p.rating,
                review_count:   p.review_count,
                tags:           p.tags,
                image_url:      p.image_url,
                created_at:     new Date(p.created_at),
                updated_at:     new Date(p.updated_at),
            },
            })
        )
        )

        inserted += batch.length
        const pct = Math.round((inserted / products.length) * 100)
        process.stdout.write(`\r  ⏳ Indexing... ${inserted}/${products.length} (${pct}%)`)
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(2)
    console.log(`\n\n Seeded ${inserted} products in ${elapsed}s`)
    console.log(`   Rate: ${Math.round(inserted / parseFloat(elapsed))} products/sec\n`)

    await backfillSearchVectors()


    const sample = await prisma.$queryRaw<Array<{ id: string; has_vector: boolean }>>`
        SELECT id, (search_vector IS NOT NULL) AS has_vector
        FROM products
        LIMIT 10
    `
    const allHaveVectors = sample.every((r: { has_vector: boolean }) => r.has_vector)
    console.log(` tsvector (inverted index) populated: ${allHaveVectors ? '✅ YES' : '❌ NO'}`)


    const stats = await prisma.$queryRaw<Array<{
        total: bigint
        categories: bigint
        brands: bigint
        avg_price: number
        vectors_populated: bigint
    }>>`
        SELECT
        COUNT(*)                         AS total,
        COUNT(DISTINCT category)         AS categories,
        COUNT(DISTINCT brand)            AS brands,
        ROUND(AVG(price)::numeric, 2)::float AS avg_price,
        COUNT(search_vector)             AS vectors_populated
        FROM products
    `

    const s = stats[0]
    console.log('\n Database summary:')
    console.log(`   Total products:       ${Number(s.total)}`)
    console.log(`   Vectors populated:    ${Number(s.vectors_populated)} / ${Number(s.total)}`)
    console.log(`   Unique categories:    ${Number(s.categories)}`)
    console.log(`   Unique brands:        ${Number(s.brands)}`)
    console.log(`   Average price:        $${s.avg_price}`)
    }

    seed()
    .catch(e => {
        console.error('\n Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })