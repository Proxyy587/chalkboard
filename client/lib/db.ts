import { PrismaClient } from "@prisma/client";

/**
 * Bump when Prisma models change so HMR/dev doesn't keep a stale singleton.
 * Symptom of stale client: `db.thread` is undefined → findMany crashes.
 */
const PRISMA_SCHEMA_REV = "threads-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: string;
};

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasThreadDelegate(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  const thread = (client as PrismaClient & { thread?: { findMany?: unknown } })
    .thread;
  return typeof thread?.findMany === "function";
}

function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    globalForPrisma.prismaSchemaRev === PRISMA_SCHEMA_REV &&
    hasThreadDelegate(cached)
  ) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = createClient();
  if (!hasThreadDelegate(client)) {
    throw new Error(
      "Prisma Client is missing the Thread model. From client/: run `bunx prisma generate` then restart `bun run dev`."
    );
  }

  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  return client;
}

/** Real PrismaClient (not a Proxy) — required by better-auth's prisma adapter. */
export const db: PrismaClient = getPrisma();
