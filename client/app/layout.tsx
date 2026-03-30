// src/app/layout.tsx

import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'ElasticShop — Ecommerce Search',
  description: 'Elasticsearch-powered product search built on PostgreSQL + Koa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
          ElasticShop — powered by PostgreSQL full-text search + Koa.js
        </footer>
      </body>
    </html>
  )
}