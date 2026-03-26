    // scripts/seed.ts — Load products.json into PostgreSQL
    // This is the "indexing" step — equivalent to ES bulk index API

    import { PrismaClient } from '../generated/prisma/client'
    import { PrismaPg } from '@prisma/adapter-pg'
    import * as fs from 'fs'
    import * as path from 'path'
    import * as dotenv from 'dotenv'

    dotenv.config({ path: path.join(__dirname, '..', '.env') })

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

    async function seed() {
    console.log(' Starting database seed...\n')

    const dataPath = path.join(__dirname, 'products.json')

    if (!fs.existsSync(dataPath)) {
        console.error(' products.json not found. Run: npm run generate:data')
        process.exit(1)
    }

    const products: RawProduct[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    console.log(` Loaded ${products.length} products from products.json`)

    // Clear existing data
    await prisma.products.deleteMany()
    console.log('  Cleared existing products')

    // Batch insert — like ES bulk API (_bulk endpoint)
    // Use batches of 50 to avoid overwhelming the connection
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
    console.log(`   Rate: ${Math.round(inserted / parseFloat(elapsed))} products/sec`)

    // Verify tsvector was populated by trigger
    const sample = await prisma.$queryRaw<Array<{ id: string; has_vector: boolean }>>`
        SELECT id, (search_vector IS NOT NULL) AS has_vector
        FROM products
        LIMIT 5
    `

    const allHaveVectors = sample.every((r: { has_vector: boolean }) => r.has_vector)
    console.log(`\n tsvector (inverted index) populated: ${allHaveVectors ? '✅ YES' : '❌ NO'}`)

    // Print sample stats
    const stats = await prisma.$queryRaw<Array<{
        total: bigint
        categories: bigint
        brands: bigint
        avg_price: number
    }>>`
        SELECT
        COUNT(*) AS total,
        COUNT(DISTINCT category) AS categories,
        COUNT(DISTINCT brand) AS brands,
        ROUND(AVG(price)::numeric, 2)::float AS avg_price
        FROM products
    `

    const s = stats[0]
    console.log('\n Database summary:')
    console.log(`   Total products:     ${Number(s.total)}`)
    console.log(`   Unique categories:  ${Number(s.categories)}`)
    console.log(`   Unique brands:      ${Number(s.brands)}`)
    console.log(`   Average price:      $${s.avg_price}`)
    }

    seed()
    .catch(e => {
        console.error('\n Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })