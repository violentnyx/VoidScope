import crypto from "crypto";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";

interface CacheEnvelope<T> {
  version: 1;
  checkedAt: number;
  updatedAt: number;
  valueHash: string;
  value: T;
}

export type CacheState = "HIT" | "STALE" | "MISS" | "REFRESHED";

export interface CacheResult<T> {
  value: T;
  state: CacheState;
  checkedAt: number;
  updatedAt: number;
}

interface CacheOptions<T> {
  key: string;
  maxAgeMs: number;
  loader: () => Promise<T>;
  isValid?: (value: T) => boolean;
  forceRefresh?: boolean;
}

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const refreshes = new Map<string, Promise<CacheEnvelope<unknown>>>();

function cachePath(key: string) {
  const digest = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(CACHE_DIR, `${digest}.json`);
}

function valueHash(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const inMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (inMemory) return inMemory;

  try {
    const parsed = JSON.parse(
      await readFile(cachePath(key), "utf8"),
    ) as CacheEnvelope<T>;
    if (
      parsed.version !== 1 ||
      typeof parsed.checkedAt !== "number" ||
      typeof parsed.updatedAt !== "number" ||
      typeof parsed.valueHash !== "string"
    ) {
      return null;
    }
    memoryCache.set(key, parsed as CacheEnvelope<unknown>);
    return parsed;
  } catch {
    return null;
  }
}

async function writeEnvelope<T>(key: string, envelope: CacheEnvelope<T>) {
  await mkdir(CACHE_DIR, { recursive: true });
  const destination = cachePath(key);
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
  const serialized = JSON.stringify(envelope);
  await writeFile(temporary, serialized, "utf8");
  try {
    await rename(temporary, destination);
  } catch {
    // Windows não substitui um arquivo existente via rename como o Linux.
    await writeFile(destination, serialized, "utf8");
    await rm(temporary, { force: true });
  }
  memoryCache.set(key, envelope as CacheEnvelope<unknown>);
}

async function refresh<T>(
  options: CacheOptions<T>,
  previous: CacheEnvelope<T> | null,
): Promise<CacheEnvelope<T>> {
  const currentRefresh = refreshes.get(options.key) as
    | Promise<CacheEnvelope<T>>
    | undefined;
  if (currentRefresh) return currentRefresh;

  const pending = (async () => {
    const value = await options.loader();
    if (options.isValid && !options.isValid(value)) {
      throw new Error(`Cache refresh rejected for ${options.key}`);
    }

    const now = Date.now();
    const nextHash = valueHash(value);
    const unchanged = previous?.valueHash === nextHash;
    const envelope: CacheEnvelope<T> = {
      version: 1,
      checkedAt: now,
      updatedAt: unchanged && previous ? previous.updatedAt : now,
      valueHash: nextHash,
      value: unchanged && previous ? previous.value : value,
    };
    await writeEnvelope(options.key, envelope);
    return envelope;
  })();

  refreshes.set(
    options.key,
    pending as Promise<CacheEnvelope<unknown>>,
  );
  try {
    return await pending;
  } finally {
    refreshes.delete(options.key);
  }
}

export async function getPersistentSWR<T>(
  options: CacheOptions<T>,
): Promise<CacheResult<T>> {
  const cached = await readEnvelope<T>(options.key);
  const fresh =
    cached && Date.now() - cached.checkedAt < options.maxAgeMs;

  if (cached && fresh && !options.forceRefresh) {
    return {
      value: cached.value,
      state: "HIT",
      checkedAt: cached.checkedAt,
      updatedAt: cached.updatedAt,
    };
  }

  if (cached && !options.forceRefresh) {
    void refresh(options, cached).catch((error) => {
      console.error(`[cache] Background refresh failed: ${options.key}`, error);
    });
    return {
      value: cached.value,
      state: "STALE",
      checkedAt: cached.checkedAt,
      updatedAt: cached.updatedAt,
    };
  }

  try {
    const next = await refresh(options, cached);
    return {
      value: next.value,
      state: cached ? "REFRESHED" : "MISS",
      checkedAt: next.checkedAt,
      updatedAt: next.updatedAt,
    };
  } catch (error) {
    if (cached) {
      return {
        value: cached.value,
        state: "STALE",
        checkedAt: cached.checkedAt,
        updatedAt: cached.updatedAt,
      };
    }
    throw error;
  }
}
