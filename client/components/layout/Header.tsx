    'use client'


    import Link from 'next/link'
    import { useRouter } from 'next/navigation'
    import { useState } from 'react'

    export function Header() {
    const router = useRouter()
    const [q, setQ] = useState('')

    function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    }

    return (
        <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">ES</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">ElasticShop</span>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search products..."
                className="input-base pl-9 pr-4 h-9 text-sm"
                />
            </div>
            </form>

            <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/search" className="px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                All Products
            </Link>
            <Link href="/categories" className="px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                Categories
            </Link>
            </nav>
        </div>
        </header>
    )
    }