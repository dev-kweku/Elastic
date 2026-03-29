    'use client'


    import { useState, useRef, useEffect, useCallback } from 'react'
    import { useRouter } from 'next/navigation'
    import { getSuggestions } from '@/lib/api'
    import type { SuggestionItem } from '@/types'

    export function HeroSearch() {
    const router = useRouter()
    const [q, setQ] = useState('')
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
    const [open, setOpen] = useState(false)
    const [highlighted, setHighlighted] = useState(-1)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const fetchSuggestions = useCallback(async (value: string) => {
        if (value.length < 2) { setSuggestions([]); setOpen(false); return }
        try {
        const res = await getSuggestions(value, 8)
        setSuggestions(res.suggestions)
        setOpen(res.suggestions.length > 0)
        } catch { setSuggestions([]); setOpen(false) }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchSuggestions(q), 200)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [q, fetchSuggestions])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const query = highlighted >= 0 ? suggestions[highlighted]?.text : q
        if (query?.trim()) {
        setOpen(false)
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!open) return
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
        if (e.key === 'Escape')    { setOpen(false); setHighlighted(-1) }
    }

    function selectSuggestion(s: SuggestionItem) {
        setOpen(false)
        if (s.type === 'product' && s.id) {
        router.push(`/products/${s.id}`)
        } else if (s.type === 'category') {
        router.push(`/search?category=${encodeURIComponent(s.text)}`)
        } else {
        router.push(`/search?q=${encodeURIComponent(s.text)}`)
        }
    }

    return (
        <div className="relative w-full max-w-xl mx-auto">
        <form onSubmit={handleSubmit}>
            <div className="relative flex items-center">
            <svg className="absolute left-4 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={e => { setQ(e.target.value); setHighlighted(-1) }}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Search for products, brands, categories..."
                className="w-full h-14 pl-12 pr-32 text-base bg-white border-2 border-gray-200 rounded-2xl outline-none focus:border-brand-500 shadow-sm transition-all placeholder:text-gray-400"
                autoFocus
            />
            <button
                type="submit"
                className="absolute right-2 h-10 px-5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 active:scale-95 transition-all"
            >
                Search
            </button>
            </div>
        </form>

        {/* Autocomplete dropdown */}
        {open && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-50">
            {suggestions.map((s, i) => (
                <button
                key={`${s.type}-${s.text}`}
                onMouseDown={() => selectSuggestion(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${i === highlighted ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                <span className="text-gray-400 w-4 text-xs">{typeIcon(s.type)}</span>
                <span className="flex-1 text-gray-800">{s.text}</span>
                <span className={`badge text-xs ${typeBadgeColor(s.type)}`}>{s.type}</span>
                </button>
            ))}
            </div>
        )}
        </div>
    )
    }

    function typeIcon(type: string) {
    return type === 'product' ? '📦' : type === 'category' ? '📁' : '🏷️'
    }

    function typeBadgeColor(type: string) {
    if (type === 'product')  return 'bg-blue-50 text-blue-700'
    if (type === 'category') return 'bg-purple-50 text-purple-700'
    return 'bg-amber-50 text-amber-700'
    }