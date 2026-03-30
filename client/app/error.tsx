'use client'


import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => { console.error(error) }, [error])
    return (
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
        <p className="text-gray-500 mb-2 text-sm">{error.message}</p>
        <p className="text-gray-400 mb-8 text-sm">Make sure the Koa backend is running on port 4000.</p>
        <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary">Try again</button>
            <Link href="/" className="btn-secondary">Go home</Link>
        </div>
        </div>
    )
}