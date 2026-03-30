

import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-7xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8 text-lg">
            The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-primary">Go home</Link>
            <Link href="/search" className="btn-secondary">Browse products</Link>
        </div>
        </div>
    )
}