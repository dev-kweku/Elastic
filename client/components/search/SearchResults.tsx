

    import type { FC } from 'react'
    import type { SearchResponse } from '@/types'
    import { ProductCard } from '@/components/product/ProductCard'
    import { SearchPagination } from '@/components/ui/pagination'

    interface SearchResultsProps {
    results: SearchResponse | null
    params: Record<string, string | undefined>
    }

    export const SearchResults: FC<SearchResultsProps> = ({ results, params }) => {
    if (!results) {
        return (
        <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Unable to connect to search API</p>
            <p className="text-sm">Make sure the Koa backend is running on port 4000</p>
        </div>
        )
    }

    if (results.hits.length === 0) {
        return (
        <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-medium text-gray-700 mb-2">No results found</p>
            <p className="text-sm text-gray-400">
            Try a different search term or remove some filters
            </p>
        </div>
        )
    }

    return (
        <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.hits.map(product => (
            <ProductCard key={product.id} product={product} />
            ))}
        </div>

        {results.total_pages > 1 && (
            <div className="mt-8">
            <SearchPagination
                currentPage={results.page}
                totalPages={results.total_pages}
                params={params}
            />
            </div>
        )}
        </div>
    )
    }