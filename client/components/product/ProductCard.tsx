

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
        <Link href={`/products/${product.id}`} className="card flex flex-col hover:shadow-md transition-all group">
        <div className="h-44 bg-muted flex items-center justify-center relative">
            <span className="text-4xl">{getCategoryEmoji(product.category)}</span>
            {!product.in_stock && (
            <span className="absolute top-2 left-2 badge bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                Out of stock
            </span>
            )}
            {discountPct > 0 && (
            <span className="absolute top-2 right-2 badge bg-green-500 text-white text-xs font-semibold">
                -{discountPct}%
            </span>
            )}
            {product.score !== null && Number(product.score) > 0 && (
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 rounded px-1">
                score: {Number(product.score).toFixed(3)}
            </span>
            )}
        </div>

        <div className="p-4 flex flex-col flex-1">
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary leading-snug line-clamp-2 mb-1">
            {truncate(product.name, 60)}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">{product.brand} · {product.subcategory}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
            {truncate(product.description, 100)}
            </p>

            {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
                {product.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">
                    {tag}
                </span>
                ))}
            </div>
            )}

            <div className="flex items-center gap-1.5 mb-3">
            <div className="flex text-amber-400 text-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.round(product.rating) ? 'text-amber-400' : 'text-muted'}>★</span>
                ))}
            </div>
            <span className="text-xs text-muted-foreground">
                {Number(product.rating).toFixed(1)} ({product.review_count.toLocaleString()})
            </span>
            </div>

            <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
            {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price!)}</span>
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