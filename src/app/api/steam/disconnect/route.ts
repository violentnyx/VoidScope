import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { saveOverrides } from "@/lib/content-store";

export async function POST(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidSessionToken(session))) {
    return NextResponse.json({ error: "Sessão de administrador inválida." }, { status: 401 });
  }

  await saveOverrides({
    integrations: {
      ranks: {
        deadlock: {
          steamAccountId: "",
          steamId64: "",
          steamId3: "",
          steamProfileName: null,
          steamAvatarUrl: null,
          steamProfileUrl: null,
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
