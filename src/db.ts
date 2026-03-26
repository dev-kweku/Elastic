    import { PrismaClient } from './generated/prisma/client'
    import { PrismaPg } from '@prisma/adapter-pg'

    declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined
    }

    function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set')
    }

    const adapter = new PrismaPg({ connectionString })

    return new PrismaClient({ adapter } as any)
    }

    export const prisma: PrismaClient =
    globalThis.__prisma ?? createPrismaClient()

    if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma
    }

    export default prisma