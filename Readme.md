# Ecommerce Search Engine

A production-grade search engine for an ecommerce platform built from scratch, implementing every core **Elasticsearch concept** using **PostgreSQL full-text search**, **Koa.js (TypeScript)**, and **Prisma ORM**. The goal is to deeply understand how Elasticsearch works by rebuilding its fundamental mechanisms at the database level.

---

## Table of Contents

- [The Core Idea](#the-core-idea)
- [Elasticsearch Concepts Implemented](#elasticsearch-concepts-implemented)
- [System Architecture](#system-architecture)
- [Project File Structure](#project-file-structure)
- [Technology Stack](#technology-stack)
- [Database Design & The Inverted Index](#database-design--the-inverted-index)
- [Search Strategy](#search-strategy)
- [Relevance Scoring](#relevance-scoring)
- [Faceted Search Strategy](#faceted-search-strategy)
- [Autocomplete Strategy](#autocomplete-strategy)
- [API Reference](#api-reference)
- [Setup & Installation](#setup--installation)
- [Running Tests](#running-tests)
- [Performance & Benchmarks](#performance--benchmarks)
- [Changelog](#changelog)

---

## The Core Idea

Elasticsearch is not magic — it is a distributed layer on top of **Apache Lucene** that provides:

1. An **inverted index** for fast full-text lookup
2. **Relevance scoring** (BM25) to rank results by importance
3. **Aggregations** to compute facets and statistics over result sets
4. **Completion suggesters** for autocomplete
5. **Distributed sharding** for horizontal scale

This project rebuilds concepts 1–4 entirely inside PostgreSQL, then exposes them through a clean REST API. The result is a search engine that behaves like Elasticsearch but runs on a single Postgres database — perfect for understanding the mechanics before reaching for a dedicated search cluster.

---

## Elasticsearch Concepts Implemented

| Elasticsearch Concept | PostgreSQL / This Implementation |
|---|---|
| **Index** | `products` table |
| **Document** | Table row (one product per row) |
| **Inverted index** | `tsvector` column + `GIN` index |
| **Analyzer / tokenizer** | `to_tsvector('english', ...)` — stems words, removes stop words |
| **Field boosting** (`name^3`) | `setweight(A/B/C/D)` in PostgreSQL trigger |
| **`match` query** | `search_vector @@ to_tsquery('english', ...)` |
| **`_score` / BM25 ranking** | `ts_rank_cd()` with custom weight array |
| **`term` filter** | `WHERE category = $1` |
| **`range` filter** | `WHERE price BETWEEN $1 AND $2` |
| **`terms` filter (array)** | `WHERE tags && ARRAY[$1, $2]` on GIN-indexed array |
| **`bool` query (must + filter)** | `WHERE` clause composed with `AND` conditions |
| **`terms` aggregation** | `GROUP BY field` |
| **`range` aggregation** | `CASE WHEN price < 25 THEN ...` |
| **Nested array aggregation** | `unnest(tags)` + `GROUP BY` |
| **`sort`** | `ORDER BY` with custom scoring expressions |
| **`from` / `size` (pagination)** | `OFFSET` / `LIMIT` |
| **`_bulk` index API** | Batched Prisma transactions (50 per batch) |
| **Completion suggester** | `ILIKE 'prefix%'` with popularity ranking |
| **`_cluster/health`** | `GET /api/health` — green / yellow / red status |
| **`_stats`** | `GET /api/stats` — index size + document counts |
| **Prefix query** | `:*` operator appended to each search token |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Postman / Frontend)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP
┌──────────────────────────────▼──────────────────────────────────┐
│                     KOA.JS API SERVER (TypeScript)              │
│                                                                 │
│  Middleware Stack                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ errorHnd │ │ compress │ │   cors   │ │   koa-logger     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│  Routes  /api/search  /api/facets  /api/suggest                 │
│          /api/health  /api/stats   /api/products                │
│                                                                 │
│  Validation Layer (Zod schemas)                                 │
│                                                                 │
│  Search Service  ←→  search.service.ts                          │
│  (All ES logic lives here)                                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    PRISMA ORM + PrismaPg Adapter                │
│                   ($queryRawUnsafe for all queries)             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                         POSTGRESQL                              │
│                                                                 │
│  products table                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ id · sku · name · description · category · brand        │   │
│  │ price · tags[] · rating · in_stock · search_vector      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Indexes                                                        │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ GIN(search_vector)   │  │ GIN(tags)                    │    │
│  │ ← The Inverted Index │  │ ← Fast array overlap queries │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
│  B-tree: category, brand, price, rating, in_stock, created_at  │
│                                                                 │
│  Trigger: auto-populates search_vector on INSERT/UPDATE        │
└─────────────────────────────────────────────────────────────────┘
                               ▲
┌──────────────────────────────┴──────────────────────────────────┐
│                     DATA PIPELINE                               │
│                                                                 │
│  generate_products.py  →  products.json  →  seed.ts            │
│  (500 products, 8 categories, realistic data)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project File Structure

```
ecommerce-search/
│
├── prisma/
│   ├── schema.prisma                    # Products model, tsvector field, GIN index hints
│   └── migrations/
│       └── 20240101000000_init/
│           └── migration.sql            # GIN indexes, tsvector trigger, all B-tree indexes
│
├── scripts/
│   ├── generate_products.py             # Generates 500 realistic products → products.json
│   ├── products.json                    # Generated dataset (500 products, 8 categories)
│   └── seed.ts                          # Bulk-loads JSON into PostgreSQL
│                                        # Also creates trigger + GIN indexes if missing
│                                        # Backfills search_vector for all rows
│
├── src/
│   ├── index.ts                         # Koa bootstrap, middleware stack, graceful shutdown
│   ├── db.ts                            # Prisma client singleton with PrismaPg adapter
│   │
│   ├── types/
│   │   └── index.ts                     # All TypeScript interfaces (SearchParams, SearchHit, etc.)
│   │
│   ├── middleware/
│   │   ├── error.ts                     # Global error handler → structured JSON responses
│   │   └── validate.ts                  # Zod validation middleware + schemas
│   │
│   ├── services/
│   │   └── search.service.ts            # ★ Core engine — all Elasticsearch logic lives here
│   │                                    #   searchProducts(), getFacets(),
│   │                                    #   getSuggestions(), getIndexStats()
│   │
│   └── routes/
│       └── index.ts                     # Route handlers — thin layer over search service
│
├── tests/
│   ├── jest.setup.ts                    # Loads .env before tests, sets timeout
│   └── search.test.ts                   # 8 suites, 45+ tests (accuracy + speed benchmarks)
│                                        # Uses raw pg Pool — no Prisma ESM issues
│
├── .env.example                         # Environment variable template
├── .gitignore
├── CHANGELOG.md                         # Full version history + ES concept map
├── nodemon.json                         # Nodemon config for hot-reload dev
├── package.json                         # Dependencies + npm scripts
├── tsconfig.json                        # Main TypeScript config (src/ only)
├── tsconfig.scripts.json                # TypeScript config for scripts/ + tests/
└── README.md
```

---

## Technology Stack

### Runtime
| Package | Version | Purpose |
|---|---|---|
| `koa` | ^2.15 | HTTP framework — minimal, middleware-based, async-first |
| `@koa/router` | ^12.0 | Route handling with prefix support |
| `@koa/cors` | ^5.0 | CORS middleware |
| `koa-body` | ^6.0 | JSON request body parsing |
| `koa-compress` | ^5.1 | gzip / brotli response compression |
| `koa-logger` | ^3.2 | HTTP request / response logging |
| `@prisma/client` | ^6.0 | PostgreSQL ORM / query builder |
| `@prisma/adapter-pg` | ^6.0 | Prisma 6 driver adapter for `pg` |
| `pg` | ^8.13 | Native PostgreSQL client |
| `zod` | ^3.x / ^4.x | Runtime schema validation |
| `dotenv` | ^16.x | Environment variable loading |

### Dev / Test
| Package | Version | Purpose |
|---|---|---|
| `typescript` | 5.7.2 | Type system (pinned — ts-node doesn't support TS 6) |
| `ts-node` | ^10.9 | Run TypeScript directly without compile step |
| `nodemon` | ^3.1 | File watcher for hot-reload development |
| `prisma` | ^6.0 | Schema management + migrations CLI |
| `jest` | ^29.7 | Test runner |
| `ts-jest` | ^29.x | TypeScript support for Jest |
| `@types/jest` | ^29.x | Jest type definitions |

---

## Database Design & The Inverted Index

### Why tsvector?

In Elasticsearch, every document field is passed through an **analyzer** that:
1. Tokenizes the text into individual words
2. Lowercases everything
3. Removes stop words ("the", "a", "is")
4. Stems words ("running" → "run", "laptops" → "laptop")
5. Stores a mapping of **token → list of document IDs** — the inverted index

PostgreSQL's `tsvector` type does exactly the same thing. When you call `to_tsvector('english', 'Sony Wireless Headphones')` it produces:

```
'headphon':3 'son':1 'wireless':2
```

Notice `headphones` became `headphon` (stemmed) and `Sony` became `son` (lowercased + stemmed). This is the analyzer at work.

### The GIN Index

A **GIN (Generalized Inverted Index)** is PostgreSQL's native inverted index structure — the same data structure Elasticsearch uses internally. Once created, a search like `WHERE search_vector @@ to_tsquery('english', 'wireless')` does a direct GIN lookup at `O(log N)` speed rather than scanning every row.

```sql
CREATE INDEX products_search_vector_gin ON products USING GIN(search_vector);
```

### Field Boosting with setweight()

In Elasticsearch you can boost specific fields: `{ "multi_match": { "fields": ["name^3", "description"] } }`. We replicate this with `setweight()`:

```sql
NEW.search_vector :=
  setweight(to_tsvector('english', name),        'A') ||  -- highest boost
  setweight(to_tsvector('english', brand),       'A') ||  -- same as name
  setweight(to_tsvector('english', subcategory), 'B') ||  -- medium boost
  setweight(to_tsvector('english', description), 'C') ||  -- lower boost
  setweight(to_tsvector('english', tags_text),   'D');    -- lowest boost
```

Weight `A` = 1.0, `B` = 0.4, `C` = 0.2, `D` = 0.1 — a match in the product name scores 10x higher than a match in the description.

### The Trigger

The trigger fires automatically on every `INSERT` and `UPDATE`, keeping `search_vector` always in sync — equivalent to Elasticsearch's automatic re-indexing when a document is updated:

```sql
CREATE TRIGGER products_search_vector_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();
```

---

## Search Strategy

### How a Search Request Flows

```
GET /api/search?q=wireless+headphones&category=Electronics&max_price=300&sort=relevance
                │                      │                    │
                │                      │                    └─ Range filter
                │                      └─ Term filter
                └─ Full-text query
```

**Step 1 — Query parsing**

The query string `"wireless headphones"` is transformed into a PostgreSQL `tsquery`:

```
wireless:* & headphones:*
```

The `:*` suffix enables prefix matching — searching `"wire"` also matches `"wireless"`, just like ES's prefix query.

**Step 2 — Filter composition**

Each filter param becomes a `WHERE` clause condition. The full bool query equivalent:

```sql
-- ES: { bool: { must: [match], filter: [term, range] } }
WHERE search_vector @@ to_tsquery('english', 'wireless:* & headphones:*')
  AND LOWER(category) = LOWER('Electronics')
  AND price <= 300
```

**Step 3 — Relevance scoring**

`ts_rank_cd()` computes a relevance score for each matching row based on:
- How many query terms matched
- Which fields they matched in (A/B/C/D weights)
- How often the terms appear (term frequency)
- Cover density — how close the matched terms are to each other

```sql
ts_rank_cd(ARRAY[0.1, 0.2, 0.4, 1.0], search_vector, tsquery, 32) AS score
```

The weight array `[0.1, 0.2, 0.4, 1.0]` maps to weights D, C, B, A respectively — matching what we set in `setweight()`.

**Step 4 — Sort & paginate**

Results are ordered by score descending (like ES `_score`), then paginated with `LIMIT` / `OFFSET`.

---

## Relevance Scoring

### BM25 vs ts_rank_cd

Elasticsearch uses **BM25** (Best Match 25) as its default scoring algorithm. BM25 considers:
- **TF** (term frequency) — how often the term appears in the document
- **IDF** (inverse document frequency) — how rare the term is across all documents
- **Field length normalisation** — shorter fields with a match score higher

`ts_rank_cd` (cover density ranking) is PostgreSQL's closest equivalent. It considers:
- Term frequency and position
- Cover density — the span between matched terms (closer = higher score)
- Document weight — which weight class (A/B/C/D) the match occurred in

The scores are not numerically identical to BM25 but produce similar ranking behaviour for practical queries.

### Sort Modes

| Sort Mode | SQL Expression | ES Equivalent |
|---|---|---|
| `relevance` | `ts_rank_cd(...) DESC` | `_score DESC` |
| `price_asc` | `price ASC` | `{ sort: [{ price: "asc" }] }` |
| `price_desc` | `price DESC` | `{ sort: [{ price: "desc" }] }` |
| `rating` | `rating DESC, review_count DESC` | `{ sort: [{ rating: "desc" }] }` |
| `newest` | `created_at DESC` | `{ sort: [{ created_at: "desc" }] }` |
| `popularity` | `review_count DESC, rating DESC` | `{ sort: [{ review_count: "desc" }] }` |
| (no query) | `rating * log(review_count + 1) DESC` | Custom script score |

---

## Faceted Search Strategy

Facets (called **aggregations** in Elasticsearch) let you show counts beside each filter option — "Electronics (63)", "Clothing (63)" etc. Each facet type maps directly to an ES aggregation type:

### Terms Aggregation → GROUP BY

```sql
-- ES: { aggs: { by_category: { terms: { field: "category" } } } }
SELECT category AS value, COUNT(*)::int AS count
FROM products
GROUP BY category
ORDER BY count DESC
```

### Range Aggregation → CASE WHEN

```sql
-- ES: { aggs: { price_ranges: { range: { field: "price", ranges: [...] } } } }
SELECT
  CASE
    WHEN price < 25   THEN 'Under $25'
    WHEN price < 50   THEN '$25 – $50'
    WHEN price < 100  THEN '$50 – $100'
    ELSE 'Over $100'
  END AS range,
  COUNT(*)::int AS count
FROM products
GROUP BY range
```

### Nested Array Aggregation → unnest()

Tags are stored as a PostgreSQL array (`text[]`). To aggregate them we use `unnest()` to explode the array into individual rows — equivalent to ES's `nested` aggregation on array fields:

```sql
-- ES: { aggs: { tags: { terms: { field: "tags" } } } }
SELECT unnest(tags) AS value, COUNT(*)::int AS count
FROM products
GROUP BY value
ORDER BY count DESC
```

---

## Autocomplete Strategy

Elasticsearch's **completion suggester** uses a specialised FST (Finite State Transducer) data structure for sub-millisecond prefix lookups. We replicate this with `ILIKE` prefix matching:

```sql
-- ES: { suggest: { product_suggest: { prefix: "son", completion: { field: "suggest" } } } }
SELECT name AS text, (rating * LOG(review_count + 1)) AS score
FROM products
WHERE LOWER(name) ILIKE 'son%'    -- prefix match
ORDER BY score DESC
LIMIT 4
```

The popularity score `rating × log(review_count + 1)` mirrors ES's `weight` field on completion suggesters — highly-rated, well-reviewed products surface first.

Suggestions are returned from three sources and merged:
1. **Product names** — matched by `ILIKE` on `name`
2. **Categories** — matched by `ILIKE` on `category`, scored by document count × 10
3. **Brands** — matched by `ILIKE` on `brand`, scored by document count × 8

---

## API Reference

All endpoints are prefixed with `/api`. Base URL: `http://localhost:4000`

---

### `GET /api/health`

Cluster health check — mirrors ES `/_cluster/health`

```bash
curl http://localhost:4000/api/health
```

```json
{
  "status": "green",
  "db_connected": true,
  "product_count": 500,
  "index_size": "1.4 MB",
  "uptime_seconds": 142,
  "version": "1.0.0"
}
```

---

### `GET /api/stats`

Index statistics — mirrors ES `/_stats`

```bash
curl http://localhost:4000/api/stats
```

```json
{
  "index": "products",
  "total_documents": 500,
  "in_stock_documents": 498,
  "avg_price": 481.97,
  "avg_rating": 3.74,
  "unique_categories": 8,
  "unique_brands": 62,
  "index_size_bytes": 1441792,
  "index_size_human": "1.4 MB"
}
```

---

### `GET /api/search`

Full-text search with filtering, scoring, and sorting — mirrors ES `POST /_search`

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Full-text search query |
| `category` | string | Filter by category (exact, case-insensitive) |
| `brand` | string | Filter by brand (exact, case-insensitive) |
| `min_price` | number | Minimum price |
| `max_price` | number | Maximum price |
| `min_rating` | number | Minimum rating (0–5) |
| `in_stock` | boolean | Only show in-stock products |
| `tags` | string | Comma-separated tags (e.g. `wireless,portable`) |
| `sort` | string | `relevance` \| `price_asc` \| `price_desc` \| `rating` \| `newest` \| `popularity` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page, max 100 (default: 20) |

```bash
curl "http://localhost:4000/api/search?q=wireless+headphones&category=Electronics&max_price=300&sort=relevance"
```

```json
{
  "hits": [
    {
      "id": "uuid",
      "sku": "SKU-ELE-0023",
      "name": "Sony Wireless Headphones Kit A210",
      "description": "Experience the difference...",
      "category": "Electronics",
      "brand": "Sony",
      "price": 189.99,
      "rating": 4.3,
      "review_count": 2841,
      "in_stock": true,
      "tags": ["wireless", "bluetooth", "portable"],
      "score": 0.0912
    }
  ],
  "total": 14,
  "page": 1,
  "limit": 20,
  "total_pages": 1,
  "took_ms": 8,
  "query": "wireless headphones"
}
```

---

### `GET /api/facets`

Aggregations over the product catalog — mirrors ES `aggs`

```bash
curl http://localhost:4000/api/facets
```

```json
{
  "categories": [
    { "value": "Electronics",    "count": 63 },
    { "value": "Clothing",       "count": 63 }
  ],
  "brands": [
    { "value": "Sony",  "count": 14 },
    { "value": "Apple", "count": 12 }
  ],
  "price_ranges": [
    { "range": "Under $25",  "min": 4.99,  "max": 24.9,  "count": 38 },
    { "range": "$25 – $50",  "min": 25.01, "max": 49.99, "count": 47 }
  ],
  "tags": [
    { "value": "wireless",  "count": 89 },
    { "value": "portable",  "count": 76 }
  ],
  "rating_distribution": [
    { "value": "4", "count": 182 },
    { "value": "3", "count": 198 }
  ],
  "total_products": 500,
  "in_stock_count": 498,
  "took_ms": 22
}
```

---

### `GET /api/suggest`

Autocomplete prefix suggestions — mirrors ES completion suggester

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Prefix string (minimum 2 characters) |
| `limit` | number | Max results (default: 8, max: 20) |

```bash
curl "http://localhost:4000/api/suggest?q=son"
```

```json
{
  "suggestions": [
    { "text": "Sony",                         "type": "brand",   "score": 140  },
    { "text": "Sony Wireless Headphones Kit", "type": "product", "score": 18.4 },
    { "text": "Sony Max Cameras Hub L192",    "type": "product", "score": 12.1 }
  ],
  "took_ms": 5
}
```

---

### `GET /api/products`

Paginated product listing (no search scoring)

```bash
curl "http://localhost:4000/api/products?page=1&limit=10"
```

---

### `GET /api/products/:id`

Single product by UUID

```bash
curl "http://localhost:4000/api/products/004334a5-138e-47ba-96c2-87f7164d03a8"
```

---

## Setup & Installation

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.9
- **PostgreSQL** >= 14 running locally
- **pnpm** >= 8

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce_search"
PORT=4000
NODE_ENV=development
```

### 3. Create the database

```bash
psql -U postgres -c "CREATE DATABASE ecommerce_search;"
```

### 4. Run migrations

```bash
pnpm prisma migrate dev
```

This creates the `products` table with all columns, indexes, and the `tsvector` trigger.

### 5. Generate Prisma client

```bash
pnpm prisma generate
```

### 6. Generate product data

```bash
pnpm generate:data
```

Runs `scripts/generate_products.py` and writes `scripts/products.json` — 500 products across 8 categories.

### 7. Seed the database

```bash
pnpm db:seed
```

Expected output:
```
🔧 Ensuring tsvector trigger and GIN index exist...
   ✅ Trigger and GIN indexes ready

📦 Loaded 500 products from products.json
🗑  Cleared existing products

  ⏳ Indexing... 500/500 (100%)

✅ Seeded 500 products in 2.19s
   Rate: 228 products/sec

🔄 Backfilling search_vector for all rows...
   ✅ Backfilled 500 rows

🔍 tsvector (inverted index) populated: ✅ YES

📊 Database summary:
   Total products:       500
   Vectors populated:    500 / 500
   Unique categories:    8
   Unique brands:        62
   Average price:        $481.97
```

### 8. Start the server

```bash
pnpm dev          # nodemon with hot-reload
```

Or without nodemon:
```bash
pnpm dev:ts       # ts-node direct
```

---

## Running Tests

```bash
pnpm test
```

The test suite runs against the real database — make sure it's seeded before running.

### Test Suites

| Suite | Tests | What it validates |
|---|---|---|
| Search Accuracy | 8 | Keyword relevance, all filter types, tag overlap |
| Relevance & Scoring | 7 | Score ordering, all 6 sort modes |
| Query Speed Benchmarks | 8 | Latency against hard thresholds |
| Facets (Aggregations) | 8 | Count correctness, range ordering, sum validation |
| Autocomplete / Suggest | 6 | Prefix matching, field types, score ordering |
| Pagination | 5 | Page isolation, total_pages, limit capping |
| Edge Cases | 6 | Special characters, empty queries, impossible ranges |
| Index Stats | 5 | Field completeness, value range validation |

### Speed Thresholds

| Query Type | Threshold |
|---|---|
| Simple keyword search | < 150 ms |
| Category / brand filter | < 200 ms |
| Full-text + multi-filter + sort | < 300 ms |
| All facet aggregations | < 400 ms |
| Autocomplete suggest | < 100 ms |
| 5 concurrent queries (wall time) | < 600 ms |

---

## Performance & Benchmarks

### Why It's Fast

**GIN index lookup** — when searching `WHERE search_vector @@ to_tsquery(...)`, PostgreSQL uses the GIN index to find matching row IDs in `O(log N)` time, exactly like Elasticsearch's inverted index. No full table scan.

**B-tree indexes** — filters on `category`, `brand`, `price`, `rating`, `in_stock` all use B-tree indexes, enabling efficient range and equality scans.

**GIN index on tags[]** — the `tags && ARRAY[...]` operator uses the GIN index on the array column, making multi-tag filters extremely fast.

**Parallel aggregations** — all facet queries run concurrently with `Promise.all()`, matching how ES computes aggregations in parallel across shards.

**Connection pooling** — `PrismaPg` uses `pg.Pool` internally, reusing connections across requests instead of opening a new TCP connection per query.

### Scaling Considerations

This implementation runs on a single PostgreSQL instance. To scale toward Elasticsearch-level throughput:

- Add **read replicas** — route search queries to replicas, writes to primary
- Add **Redis caching** — cache facet results (they change infrequently)
- Use **cursor-based pagination** (`WHERE id > $last_id`) instead of `OFFSET` for deep pages
- Add a **materialized view** for the most expensive aggregations, refreshed on a schedule
- At very large scale (100M+ documents), migrate the `tsvector` index to a dedicated Elasticsearch or OpenSearch cluster while keeping transactional data in PostgreSQL



