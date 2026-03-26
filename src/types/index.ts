    // src/types/index.ts — Shared types across the search engine

    export interface Product {
    id: string
    sku: string
    name: string
    description: string
    category: string
    subcategory: string
    brand: string
    price: number
    original_price: number | null
    currency: string
    stock_qty: number
    in_stock: boolean
    rating: number
    review_count: number
    tags: string[]
    image_url: string | null
    created_at: Date
    updated_at: Date
    }

    // ── Search request params (mirrors ES query DSL structure) ─────────────────

    export type SortField = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity'

    export interface SearchParams {
    q?: string               // full-text query — like ES "query.match"
    category?: string        // term filter — like ES "term" filter
    brand?: string           // term filter
    min_price?: number       // range filter — like ES "range" filter
    max_price?: number       // range filter
    in_stock?: boolean       // term filter
    min_rating?: number      // range filter
    tags?: string[]          // terms filter — like ES "terms" filter
    sort?: SortField         // sort — like ES "sort"
    page?: number            // pagination
    limit?: number           // page size — like ES "size"
    }

    // ── Search response (mirrors ES response envelope) ────────────────────────

    export interface SearchHit {
    id: string
    sku: string
    name: string
    description: string
    category: string
    subcategory: string
    brand: string
    price: number
    original_price: number | null
    in_stock: boolean
    stock_qty: number
    rating: number
    review_count: number
    tags: string[]
    image_url: string | null
    score: number | null     // ts_rank score — like ES "_score"
    created_at: Date
    updated_at: Date
    }

    export interface SearchResponse {
    hits: SearchHit[]
    total: number            // like ES "hits.total.value"
    page: number
    limit: number
    total_pages: number
    took_ms: number          // query time — like ES "took"
    query: string | null     // echoed back for debugging
    }

    // ── Facets (mirrors ES aggregations) ─────────────────────────────────────

    export interface FacetBucket {
    value: string
    count: number            // like ES "doc_count"
    }

    export interface PriceBucket {
    range: string
    min: number
    max: number
    count: number
    }

    export interface FacetsResponse {
    categories: FacetBucket[]    // like ES "terms" aggregation on category
    brands: FacetBucket[]        // like ES "terms" aggregation on brand
    price_ranges: PriceBucket[]  // like ES "range" aggregation on price
    tags: FacetBucket[]          // like ES "terms" aggregation on tags
    rating_distribution: FacetBucket[]
    total_products: number
    in_stock_count: number
    took_ms: number
    }

    // ── Autocomplete (mirrors ES "completion suggester") ─────────────────────

    export interface SuggestionItem {
    text: string
    type: 'product' | 'category' | 'brand'
    id?: string
    score: number
    }

    export interface SuggestResponse {
    suggestions: SuggestionItem[]
    took_ms: number
    }

    // ── Health check ──────────────────────────────────────────────────────────

    export interface HealthResponse {
    status: 'green' | 'yellow' | 'red'  // mirrors ES cluster health colors
    db_connected: boolean
    product_count: number
    index_size?: string
    uptime_seconds: number
    version: string
    }

    // ── Error response ────────────────────────────────────────────────────────

    export interface ErrorResponse {
    error: string
    details?: string
    status: number
    }