    'use client'
    

    import { useRouter } from 'next/navigation'
    import type { FacetsResponse } from '@/types'
    import { formatNumber } from '@/lib/utils'

    interface Props {
    facets: FacetsResponse | null
    params: Record<string, string | undefined>
    }

    export function FacetSidebar({ facets, params }: Props) {
    const router = useRouter()

    function applyFilter(key: string, value: string) {
        const newParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => { if (v && k !== 'page') newParams.set(k, v) })
        if (newParams.get(key) === value) {
        newParams.delete(key)
        } else {
        newParams.set(key, value)
        }
        router.push(`/search?${newParams.toString()}`)
    }

    function isActive(key: string, value: string) {
        return params[key] === value
    }

    return (
        <div className="space-y-5" id="filters">

        {/* In stock toggle */}
        <div>
            <label className="flex items-center gap-2 cursor-pointer group">
            <div
                onClick={() => applyFilter('in_stock', params.in_stock === 'true' ? '' : 'true')}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${params.in_stock === 'true' ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${params.in_stock === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-gray-700">In stock only</span>
            </label>
        </div>

        {/* Categories */}
        {facets && facets.categories.length > 0 && (
            <FacetGroup title="Category">
            {facets.categories.map(cat => (
                <FacetButton
                key={cat.value}
                label={cat.value}
                count={cat.count}
                active={isActive('category', cat.value)}
                onClick={() => applyFilter('category', cat.value)}
                />
            ))}
            </FacetGroup>
        )}

        {/* Price ranges */}
        {facets && facets.price_ranges.length > 0 && (
            <FacetGroup title="Price">
            {facets.price_ranges.map(p => (
                <FacetButton
                key={p.range}
                label={p.range}
                count={p.count}
                active={isActive('min_price', String(Math.floor(p.min))) && isActive('max_price', String(Math.ceil(p.max)))}
                onClick={() => {
                    const newParams = new URLSearchParams()
                    Object.entries(params).forEach(([k, v]) => { if (v && !['min_price', 'max_price', 'page'].includes(k)) newParams.set(k, v) })
                    newParams.set('min_price', String(Math.floor(p.min)))
                    newParams.set('max_price', String(Math.ceil(p.max)))
                    router.push(`/search?${newParams.toString()}`)
                }}
                />
            ))}
            </FacetGroup>
        )}

        {/* Rating */}
        <FacetGroup title="Rating">
            {[4, 3, 2].map(r => (
            <FacetButton
                key={r}
                label={`${r}+ stars`}
                count={null}
                active={isActive('min_rating', String(r))}
                onClick={() => applyFilter('min_rating', String(r))}
            />
            ))}
        </FacetGroup>

        {/* Brands */}
        {facets && facets.brands.length > 0 && (
            <FacetGroup title="Brand">
            {facets.brands.slice(0, 10).map(b => (
                <FacetButton
                key={b.value}
                label={b.value}
                count={b.count}
                active={isActive('brand', b.value)}
                onClick={() => applyFilter('brand', b.value)}
                />
            ))}
            </FacetGroup>
        )}

        {/* Tags */}
        {facets && facets.tags.length > 0 && (
            <FacetGroup title="Tags">
            <div className="flex flex-wrap gap-1.5">
                {facets.tags.slice(0, 15).map(t => (
                <button
                    key={t.value}
                    onClick={() => applyFilter('tags', t.value)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    params.tags?.includes(t.value)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    }`}
                >
                    {t.value}
                </button>
                ))}
            </div>
            </FacetGroup>
        )}
        </div>
    )
    }

    function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
        <div className="space-y-1">{children}</div>
        </div>
    )
    }

    function FacetButton({ label, count, active, onClick }: {
    label: string; count: number | null; active: boolean; onClick: () => void
    }) {
    return (
        <button
        onClick={onClick}
        className={`w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-lg transition-colors text-left ${
            active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
        }`}
        >
        <span className="truncate">{label}</span>
        {count !== null && <span className="text-xs text-gray-400 ml-2 shrink-0">{formatNumber(count)}</span>}
        </button>
    )
    }