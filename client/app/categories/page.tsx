

    import Link from 'next/link'
    import { getFacets, searchProducts } from '@/lib/api'
    import { formatNumber, formatPrice } from '@/lib/utils'
    import type { Metadata } from 'next'

    export const metadata: Metadata = {
    title: 'Categories — ElasticShop',
    description: 'Browse all product categories',
    }

    export default async function CategoriesPage() {
    const facets = await getFacets().catch(() => null)
    const categories = facets?.categories ?? []

    const categoryPreviews = await Promise.all(
        categories.map(async cat => {
        const results = await searchProducts({
            category: cat.value,
            sort: 'rating',
            limit: 3,
        }).catch(() => null)
        const hits = results?.hits ?? []
        const avg_price = hits.length > 0
            ? hits.reduce((sum, h) => sum + h.price, 0) / hits.length
            : 0
        return { ...cat, products: hits, avg_price }
        })
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">All categories</h1>
            <p className="text-gray-500 text-sm">
            {formatNumber(categories.reduce((sum, c) => sum + c.count, 0))} products across {categories.length} categories
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {categoryPreviews.map(cat => (
            <div key={cat.value} className="card hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCategoryEmoji(cat.value)}</span>
                    <div>
                    <h2 className="font-semibold text-gray-900">{cat.value}</h2>
                    <p className="text-xs text-gray-400">
                        {formatNumber(cat.count)} products · avg {formatPrice(cat.avg_price)}
                    </p>
                    </div>
                </div>
                <Link
                    href={`/search?category=${encodeURIComponent(cat.value)}`}
                    className="btn-secondary text-xs py-1.5 px-3"
                >
                    Browse all →
                </Link>
                </div>

                {/* Top products preview */}
                {cat.products.length > 0 && (
                <div className="divide-y divide-gray-50">
                    {cat.products.map(product => (
                    <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-xl">{getCategoryEmoji(product.category)}</span>
                        <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{product.name}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-amber-400 text-xs">
                            {'★'.repeat(Math.round(Number(product.rating)))}
                            </span>
                            <span className="text-xs text-gray-400">{product.brand}</span>
                        </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 shrink-0">
                        {formatPrice(product.price)}
                        </span>
                    </Link>
                    ))}
                </div>
                )}
            </div>
            ))}
        </div>
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