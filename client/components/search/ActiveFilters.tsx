    'use client'


    import { useRouter } from 'next/navigation'

    interface Props {
    params: Record<string, string | undefined>
    }

    const FILTER_LABELS: Record<string, string> = {
    q: 'Query', category: 'Category', brand: 'Brand',
    min_price: 'Min price', max_price: 'Max price',
    min_rating: 'Min rating', in_stock: 'In stock', tags: 'Tags',
    }

    export function ActiveFilters({ params }: Props) {
    const router = useRouter()
    const active = Object.entries(params).filter(([k, v]) =>
        v && !['sort', 'page', 'limit'].includes(k)
    )

    if (active.length === 0) return null

    function removeFilter(key: string) {
        const newParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
        if (v && k !== key && k !== 'page') newParams.set(k, v)
        })
        router.push(`/search?${newParams.toString()}`)
    }

    function clearAll() {
        router.push('/search')
    }

    return (
        <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="text-xs text-gray-400">Active filters:</span>
        {active.map(([key, value]) => (
            <span
            key={key}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full border border-brand-200"
            >
            {FILTER_LABELS[key] || key}: {key === 'in_stock' ? 'Yes' : value}
            <button
                onClick={() => removeFilter(key)}
                className="ml-0.5 hover:text-brand-900 transition-colors"
            >
                ×
            </button>
            </span>
        ))}
        {active.length > 1 && (
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Clear all
            </button>
        )}
        </div>
    )
    }