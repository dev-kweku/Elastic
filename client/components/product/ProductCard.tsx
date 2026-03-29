    // src/components/product/ProductCard.tsx

    import Link from 'next/link'
    import type { SearchHit } from '@/types'
    import { formatPrice, discount, truncate } from '@/lib/utils'

    interface Props {
    product: SearchHit
    }

    export function ProductCard({ product }: Props) {
    const hasDiscount = product.original_price && product.original_price > product.price
    const discountPct = hasDiscount ? discount(product.original_price!, product.price) : 0

    return (
        <Link href={`/products/${product.id}`} className="card flex flex-col hover:shadow-md hover:border-gray-200 transition-all group">
        {/* Image placeholder */}
        <div className="h-44 bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
            <span className="text-4xl">{getCategoryEmoji(product.category)}</span>
            {!product.in_stock && (
            <span className="absolute top-2 left-2 badge bg-red-50 text-red-600 border border-red-200 text-xs">
                Out of stock
            </span>
            )}
            {discountPct > 0 && (
            <span className="absolute top-2 right-2 badge bg-green-500 text-white text-xs font-semibold">
                -{discountPct}%
            </span>
            )}
            {product.score !== null && product.score > 0 && (
            <span className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 rounded px-1">
                score: {Number(product.score).toFixed(3)}
            </span>
            )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 group-hover:text-brand-600 leading-snug line-clamp-2">
                {truncate(product.name, 60)}
            </h3>
            </div>

            <p className="text-xs text-gray-400 mb-2">{product.brand} · {product.subcategory}</p>

            <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
            {truncate(product.description, 100)}
            </p>

            {/* Tags */}
            {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
                {product.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    {tag}
                </span>
                ))}
            </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-3">
            <div className="flex text-amber-400 text-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.round(product.rating) ? 'text-amber-400' : 'text-gray-200'}>★</span>
                ))}
            </div>
            <span className="text-xs text-gray-400">
                {Number(product.rating).toFixed(1)} ({product.review_count.toLocaleString()})
            </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.price)}
            </span>
            {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.original_price!)}
                </span>
            )}
            </div>
        </div>
        </Link>
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