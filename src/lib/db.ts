import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const queryLoggingEnabled = process.env.DTEP_PRISMA_QUERY_LOG === 'true'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Full SQL query logging is useful while developing locally, but it turns
    // the CASE-01 read path into hundreds of synchronous log writes in the
    // production standalone server. Keep errors visible by default and make
    // query logging an explicit diagnostic opt-in.
    log: queryLoggingEnabled ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
