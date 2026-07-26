import "server-only";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface WeddingLink {
  loja: string;
  modelo: string;
  url: string;
  refLabel?: string;
  refUrl?: string;
}

export interface WeddingItem {
  id: string;
  categoria: string;
  nome: string;
  descricao: string;
  precoEstimado: string;
  imagemUrl: string;
  links: WeddingLink[];
  reservadoPor: string | null;
  reservadoEm: string | null;
}

export interface WeddingConfig {
  eyebrow: string;
  heroLine1: string;
  heroItalic: string;
  heroLine3: string;
  lede: string;
  footer: string;
  eventDate: string | null;
  eventLabel: string;
  categorias: string[];
  [key: string]: unknown;
}

export interface WeddingSession {
  token: string;
  created: number;
}

export interface WeddingDatabase {
  config: WeddingConfig;
  items: WeddingItem[];
  adminPasswordHash?: string;
  sessions?: WeddingSession[];
}

export const WEDDING_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function databasePath(): string {
  const configured = process.env.WEDDING_DATA_FILE?.trim();
  return configured
    ? path.resolve(configured)
    : path.join(process.cwd(), "data", "wedding.json");
}

export function readWeddingDatabase(): WeddingDatabase {
  const file = databasePath();
  if (!existsSync(file)) {
    throw new Error(`Banco da wishlist não encontrado em ${file}.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as WeddingDatabase;
}

export function writeWeddingDatabase(database: WeddingDatabase): void {
  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

export function hashWeddingPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyWeddingPassword(
  password: string,
  stored: string | undefined
): boolean {
  if (!stored) return false;
  const [salt, encodedHash] = stored.split(":");
  if (!salt || !encodedHash) return false;

  try {
    const expected = Buffer.from(encodedHash, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

export function isWeddingAdmin(
  request: Request,
  database: WeddingDatabase
): boolean {
  const token = bearerToken(request);
  if (!token) return false;
  return (database.sessions ?? []).some(
    (session) =>
      session.token === token &&
      Number.isFinite(session.created) &&
      Date.now() - session.created < WEDDING_SESSION_TTL_MS
  );
}
