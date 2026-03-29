    // src/app/products/[id]/page.tsx — Product detail page

    import { notFound } from 'next/navigation'
    import Link from 'next/link'
    import { getProduct, searchProducts } from '@/lib/api'
    import { formatPrice, formatNumber, discount } from '@/lib/utils'
    import { ProductCard } from '@/components/product/ProductCard'
    import type { Metadata } from 'next'

    interface PageProps {
    params: Promise<{ id: string }>
    }

    export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const product = await getProduct(id).catch(() => null)
    if (!product) return { title: 'Product not found' }
    return {
        title: `${product.name} — ElasticShop`,
        description: product.description,
    }
    }

    export default async function ProductPage({ params }: PageProps) {
    const { id } = await params
    const product = await getProduct(id).catch(() => null)

    if (!product) notFound()

    const hasDiscount = product.original_price && product.original_price > product.price
    const discountPct = hasDiscount ? discount(product.original_price!, product.price) : 0

    // Related products from same category
    const related = await searchProducts({
        category: product.category,
        sort: 'rating',
        limit: 4,
    }).catch(() => null)

    const relatedHits = related?.hits.filter(h => h.id !== product.id).slice(0, 3) ?? []

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/" className="hover:text-gray-600">Home</Link>
            <span>/</span>
            <Link href={`/search?category=${encodeURIComponent(product.category)}`} className="hover:text-gray-600">
            {product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-xs">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
            {/* Image */}
            <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl h-80 lg:h-auto flex items-center justify-center relative">
            <span className="text-8xl">{getCategoryEmoji(product.category)}</span>
            {!product.in_stock && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                <span className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                    Out of stock
                </span>
                </div>
            )}
            {discountPct > 0 && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full">
                -{discountPct}% OFF
                </span>
            )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
            {/* Category + Brand */}
            <div className="flex items-center gap-2 mb-3">
                <Link
                href={`/search?category=${encodeURIComponent(product.category)}`}
                className="badge bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
                >
                {product.category}
                </Link>
                <Link
                href={`/search?brand=${encodeURIComponent(product.brand)}`}
                className="badge bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                {product.brand}
                </Link>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {product.name}
            </h1>

            <p className="text-sm text-gray-400 mb-4">SKU: {product.sku}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-5">
                <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < Math.round(product.rating) ? 'text-amber-400' : 'text-gray-200'}>★</span>
                ))}
                </div>
                <span className="text-sm font-medium text-gray-700">{Number(product.rating).toFixed(1)}</span>
                <span className="text-sm text-gray-400">({formatNumber(product.review_count)} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                {hasDiscount && (
                <span className="text-xl text-gray-400 line-through">{formatPrice(product.original_price!)}</span>
                )}
                {hasDiscount && (
                <span className="text-sm text-green-600 font-medium">Save {formatPrice(product.original_price! - product.price)}</span>
                )}
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

            {/* Tags */}
            {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map(tag => (
                    <Link
                    key={tag}
                    href={`/search?tags=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                    #{tag}
                    </Link>
                ))}
                </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6 text-sm">
                <span className={`w-2 h-2 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className={product.in_stock ? 'text-green-700' : 'text-red-600'}>
                {product.in_stock ? `In stock (${formatNumber(product.stock_qty)} available)` : 'Out of stock'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                disabled={!product.in_stock}
                className="btn-primary flex-1 py-3 text-base disabled:opacity-50"
                >
                {product.in_stock ? 'Add to cart' : 'Out of stock'}
                </button>
                <button className="btn-secondary px-4 py-3">
                ♡
                </button>
            </div>

            {/* Meta */}
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                <div>
                <span className="text-gray-400">Subcategory</span>
                <p className="text-gray-700 font-medium">{product.subcategory}</p>
                </div>
                <div>
                <span className="text-gray-400">Currency</span>
                <p className="text-gray-700 font-medium">{product.currency}</p>
                </div>
            </div>
            </div>
        </div>

        {/* Related products */}
        {relatedHits.length > 0 && (
            <section>
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900">More from {product.category}</h2>
                <Link
                href={`/search?category=${encodeURIComponent(product.category)}`}
                className="text-sm text-brand-600 hover:underline"
                >
                View all →
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedHits.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            </section>
        )}
        </div>
    )
    }

    function getCategoryEmoji(category: string): string {
    const map: Record<string, string> = {
        'Electronics': '💻', 'Clothing': '👕', 'Home & Kitchen': '🏠',
        'Sports & Outdoors': '⛺', 'Books': '📚', 'Beauty & Health': '✨',
        'Toys & Games': '🎮', 'Automotive': '🚗',
    }
    return map[category] ?? '📦'
    }