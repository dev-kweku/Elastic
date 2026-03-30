

    import Link from 'next/link'
    import type { SearchResponse } from '@/types'
    import { formatNumber } from '@/lib/utils'
    import { SortDropdown } from './SortDropdown'

    const SORT_OPTIONS = [
    { value: 'relevance',  label: 'Most relevant' },
    { value: 'price_asc',  label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'rating',     label: 'Top rated' },
    { value: 'newest',     label: 'Newest first' },
    { value: 'popularity', label: 'Most popular' },
    ]

    interface Props {
    results: SearchResponse | null
    params: Record<string, string | undefined>
    }

    export function SearchHeader({ results, params }: Props) {
    const total = results?.total ?? 0
    const took = results?.took_ms ?? 0
    const query = results?.query

    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
            <h1 className="text-lg font-semibold text-gray-900">
            {query ? (
                <>Results for <span className="text-brand-600">&ldquo;{query}&rdquo;</span></>
            ) : params.category ? (
                params.category
            ) : (
                'All products'
            )}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
            {formatNumber(total)} product{total !== 1 ? 's' : ''} found
            {took > 0 && <span className="ml-1.5 text-green-600">in {took}ms</span>}
            </p>
        </div>

        <div className="flex items-center gap-2">
            {/* Mobile filter toggle */}
            <Link
            href="#filters"
            className="lg:hidden btn-secondary text-xs py-1.5 px-3"
            >
            Filters
            </Link>
            <SortDropdown current={params.sort || 'relevance'} options={SORT_OPTIONS} params={params} />
        </div>
        </div>
    )
    }