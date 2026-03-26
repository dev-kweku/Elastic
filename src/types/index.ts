
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


    export type SortField = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity'

    export interface SearchParams {
    q?: string               
    category?: string        
    brand?: string           
    min_price?: number       
    max_price?: number       
    in_stock?: boolean       
    min_rating?: number     
    tags?: string[]          
    sort?: SortField        
    page?: number            
    limit?: number           
    }


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
    score: number | null    
    created_at: Date
    updated_at: Date
    }

    export interface SearchResponse {
    hits: SearchHit[]
    total: number           
    page: number
    limit: number
    total_pages: number
    took_ms: number          
    query: string | null    
    }


    export interface FacetBucket {
    value: string
    count: number           
    }

    export interface PriceBucket {
    range: string
    min: number
    max: number
    count: number
    }

    export interface FacetsResponse {
    categories: FacetBucket[]     
    brands: FacetBucket[]        
    price_ranges: PriceBucket[]  
    tags: FacetBucket[]          
    rating_distribution: FacetBucket[]
    total_products: number
    in_stock_count: number
    took_ms: number
    }



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

    

    export interface HealthResponse {
    status: 'green' | 'yellow' | 'red'  
    db_connected: boolean
    product_count: number
    index_size?: string
    uptime_seconds: number
    version: string
    }

    

    export interface ErrorResponse {
    error: string
    details?: string
    status: number
    }