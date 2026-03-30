

import Link from 'next/link'
import { getStats, getFacets } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { HeroSearch } from '@/components/search/HeroSearch'

export default async function HomePage() {
  const [stats, facets] = await Promise.all([
    getStats().catch(() => null),
    getFacets().catch(() => null),
  ])

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/40 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
            PostgreSQL full-text search — Elasticsearch concepts
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Find exactly what<br />you&apos;re looking for
          </h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Search across {formatNumber(stats?.total_documents ?? 500)} products with relevance scoring, faceted filters, and instant autocomplete.
          </p>
          <HeroSearch />
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="border-y border-border bg-background py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Products',   value: formatNumber(stats.total_documents) },
                { label: 'In stock',   value: formatNumber(stats.in_stock_documents) },
                { label: 'Categories', value: String(stats.unique_categories) },
                { label: 'Brands',     value: String(stats.unique_brands) },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category grid */}
      {facets && (
        <section className="max-w-7xl mx-auto px-4 py-12 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Shop by category</h2>
            <Link href="/search" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {facets.categories.map(cat => (
              <Link key={cat.value} href={`/search?category=${encodeURIComponent(cat.value)}`}
                className="card p-4 hover:shadow-md transition-all group">
                <div className="text-2xl mb-2">{getCategoryEmoji(cat.value)}</div>
                <div className="font-medium text-foreground group-hover:text-primary text-sm">{cat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatNumber(cat.count)} products</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular searches */}
      <section className="max-w-7xl mx-auto px-4 pb-12 w-full">
        <h2 className="text-xl font-semibold text-foreground mb-4">Popular searches</h2>
        <div className="flex flex-wrap gap-2">
          {['wireless headphones', 'laptop', 'running shoes', 'skincare', 'yoga mat', 'cookbook', 'camping gear', 'smartwatch'].map(term => (
            <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}
              className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-full text-sm hover:bg-accent transition-colors">
              {term}
            </Link>
          ))}
        </div>
      </section>
    </div>
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