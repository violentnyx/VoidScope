import { spawn, execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { appendFileSync, closeSync, openSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

export async function POST() {
  const sourcePath = process.env.VOIDSCOPE_SOURCE_PATH ?? "/home/ubuntu/voidscope-source";
  const updateScript = path.join(sourcePath, "scripts", "server-update.sh");
  const branch = process.env.VOIDSCOPE_DEPLOY_BRANCH ?? "main";
  const service = process.env.VOIDSCOPE_SERVICE_NAME ?? "nyx-site";
  const logPath = process.env.VOIDSCOPE_UPDATE_LOG ?? path.join(os.tmpdir(), "voidscope-site-update.log");

  try {
    await access(updateScript, constants.R_OK);
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: sourcePath,
      windowsHide: true,
    });

    if (stdout.trim()) {
      return NextResponse.json(
        {
          error: "O servidor tem alterações locais pendentes.",
          detail: "O update foi cancelado para não sobrescrever arquivos fora do Git.",
        },
        { status: 409 },
      );
    }

    appendFileSync(logPath, `\n[${new Date().toISOString()}] Iniciando update da branch ${branch}.\n`);
    const logFd = openSync(logPath, "a");
    const child = spawn("bash", [updateScript, branch, service], {
      cwd: sourcePath,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
      env: process.env,
    });
    closeSync(logFd);
    child.unref();

    return NextResponse.json(
      {
        ok: true,
        status: "started",
        message: `Update iniciado pela branch ${branch}. O site reiniciará quando o build terminar.`,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Falha iniciando atualização do site:", error);
    return NextResponse.json(
      {
        error: "Não foi possível iniciar o update pelo Git.",
        detail: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
