
    import type {
    SearchParams,
    SearchResponse,
    FacetsResponse,
    SuggestResponse,
    StatsResponse,
    Product,
    } from '@/types'

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

    async function apiFetch<T>(path: string, params?: Record<string, string | number | boolean | string[] | undefined>): Promise<T> {
    const url = new URL(`${BASE_URL}/api${path}`)

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === '') return
        if (Array.isArray(value)) {
            url.searchParams.set(key, value.join(','))
        } else {
            url.searchParams.set(key, String(value))
        }
        })
    }

    const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 0 }, // always fresh for search
    })

    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${await res.text()}`)
    }

    return res.json() as Promise<T>
    }

    export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
    return apiFetch<SearchResponse>('/search', params as Record<string, string | number | boolean | string[] | undefined>)
    }

    export async function getFacets(params?: Partial<SearchParams>): Promise<FacetsResponse> {
    return apiFetch<FacetsResponse>('/facets', params as Record<string, string | number | boolean | string[] | undefined>)
    }

    export async function getSuggestions(q: string, limit = 8): Promise<SuggestResponse> {
    return apiFetch<SuggestResponse>('/suggest', { q, limit })
    }

    export async function getProduct(id: string): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`)
    }

    export async function getStats(): Promise<StatsResponse> {
    return apiFetch<StatsResponse>('/stats')
    }