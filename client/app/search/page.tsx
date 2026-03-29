    // src/app/search/page.tsx — Search results page

    import { Suspense } from 'react'
    import { searchProducts, getFacets } from '@/lib/api'
    import { SearchResults } from '@/components/search/SearchResults'
    import { FacetSidebar } from '@/components/search/FacetSlidebar'
    import { SearchHeader } from '@/components/search/SearchHeader'
    import { ActiveFilters } from '@/components/search/ActiveFilters'
    import type { SortField } from '@/types'

    interface PageProps {
    searchParams: Promise<{
        q?: string
        category?: string
        brand?: string
        min_price?: string
        max_price?: string
        min_rating?: string
        in_stock?: string
        tags?: string
        sort?: string
        page?: string
    }>
    }

    export default async function SearchPage({ searchParams }: PageProps) {
    const params = await searchParams

    const searchQuery = {
        q: params.q,
        category: params.category,
        brand: params.brand,
        min_price: params.min_price ? Number(params.min_price) : undefined,
        max_price: params.max_price ? Number(params.max_price) : undefined,
        min_rating: params.min_rating ? Number(params.min_rating) : undefined,
        in_stock: params.in_stock === 'true' ? true : undefined,
        tags: params.tags ? params.tags.split(',') : undefined,
        sort: (params.sort as SortField) || 'relevance',
        page: params.page ? Number(params.page) : 1,
        limit: 20,
    }

    const [results, facets] = await Promise.all([
        searchProducts(searchQuery).catch(() => null),
        getFacets({ q: params.q, category: params.category }).catch(() => null),
    ])

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
        <SearchHeader results={results} params={params} />
        <ActiveFilters params={params} />

        <div className="flex gap-6 mt-4">
            {/* Sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
            <FacetSidebar facets={facets} params={params} />
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
            <Suspense fallback={<ResultsSkeleton />}>
                <SearchResults results={results} params={params} />
            </Suspense>
            </div>
        </div>
        </div>
    )
    }

    function ResultsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
            <div className="h-40 bg-gray-100 rounded-lg mb-3" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
        ))}
        </div>
    )
    }