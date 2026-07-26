import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

/**
 * Senha do painel de admin com "registro único": na primeira vez que
 * alguém acessa /admin/login e não existe senha salva, o que for
 * digitado vira a senha (hash + salt gravados em disco). A partir daí
 * esse arquivo passa a existir e login vira só verificação — não tem
 * endpoint de "trocar senha" nem "esqueci a senha". Pra resetar, é
 * preciso apagar o arquivo na mão (acesso ao servidor/disco).
 *
 * Mesmo padrão de disco persistente do content-store.ts: funciona em
 * servidor sempre ligado (Lightsail), não funciona em serverless/edge
 * sem trocar por banco de verdade.
 */

const scrypt = promisify(scryptCallback);

const DATA_DIR = path.join(process.cwd(), "data");
const CREDENTIALS_PATH = path.join(DATA_DIR, "admin-credentials.json");

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

interface StoredCredentials {
  salt: string; // hex
  hash: string; // hex
  createdAt: string; // ISO — só informativo, não é usado pra validar nada
}

async function readCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(CREDENTIALS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (typeof parsed.salt === "string" && typeof parsed.hash === "string") {
      return parsed as StoredCredentials;
    }
    return null;
  } catch {
    // Arquivo não existe ainda (ninguém registrou senha) ou está corrompido.
    return null;
  }
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const salt = Buffer.from(saltHex, "hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return derived.toString("hex");
}

export async function isPasswordRegistered(): Promise<boolean> {
  return (await readCredentials()) !== null;
}

/**
 * Registra a senha do painel. Só funciona se ainda não existir uma
 * senha salva — chamando de novo depois disso lança erro. Não existe
 * "sobrescrever": a única forma de trocar é apagar
 * data/admin-credentials.json manualmente no servidor.
 */
export async function registerPassword(password: string): Promise<void> {
  const existing = await readCredentials();
  if (existing) {
    throw new Error("Senha do painel já foi registrada — apague data/admin-credentials.json para reset.");
  }

  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = await deriveHash(password, salt);

  const record: StoredCredentials = {
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };

  try {
    await mkdir(DATA_DIR, { recursive: true });
    // Grava com flag "wx": falha se o arquivo já existir, fechando a
    // brecha de corrida entre duas requisições de registro simultâneas.
    await writeFile(CREDENTIALS_PATH, JSON.stringify(record, null, 2), {
      encoding: "utf-8",
      flag: "wx",
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EEXIST") {
      // Corrida: outra requisição registrou primeiro. Sinaliza isso
      // especificamente pra rota poder responder de forma correta.
      throw new Error("ALREADY_REGISTERED");
    }
    // Qualquer outro erro (permissão, disco cheio, pasta não pode ser
    // criada, etc.) precisa aparecer de verdade nos logs — não é
    // "já registrado".
    console.error("Falha ao gravar data/admin-credentials.json:", err);
    throw err;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const stored = await readCredentials();
  if (!stored) return false;

  const candidateHash = await deriveHash(password, stored.salt);

  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(stored.hash, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
