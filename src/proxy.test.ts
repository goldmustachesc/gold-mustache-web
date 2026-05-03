import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const intlHandler = vi.hoisted(() =>
  vi.fn(() => {
    const res = NextResponse.next();
    return res;
  }),
);

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => intlHandler),
}));

const mockUpdateSession = vi.hoisted(() => vi.fn());

vi.mock("./lib/supabase/middleware", () => ({
  updateSession: (request: NextRequest) => mockUpdateSession(request),
}));

import { proxy } from "./proxy";

function requestTo(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("proxy", () => {
  beforeEach(() => {
    intlHandler.mockClear();
    mockUpdateSession.mockReset();
  });

  it("ignora sessão para rotas públicas de API", async () => {
    const req = requestTo("http://localhost:3000/api/barbers");

    const res = await proxy(req);

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("retorna apenas a resposta do Supabase para demais rotas /api", async () => {
    const supabaseResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      supabaseResponse,
      user: null,
      authError: false,
    });

    const req = requestTo("http://localhost:3000/api/admin/x");

    const res = await proxy(req);

    expect(res).toBe(supabaseResponse);
    expect(intlHandler).not.toHaveBeenCalled();
  });

  it("redireciona visitante anônimo de rota protegida para login", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
      authError: false,
    });

    const req = requestTo("http://localhost:3000/pt-BR/dashboard");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/pt-BR/login");
    expect(res.headers.get("location")).toContain("redirect");
  });

  it("redireciona usuário autenticado para fora de rotas de auth", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "user-1" },
      authError: false,
    });

    const req = requestTo("http://localhost:3000/pt-BR/login");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/pt-BR/dashboard");
  });

  it("aplica intl e repassa cookies da sessão para rotas auth", async () => {
    const supabaseResponse = NextResponse.next();
    supabaseResponse.cookies.set("sb-test", "cookie-value", { path: "/" });
    mockUpdateSession.mockResolvedValue({
      supabaseResponse,
      user: null,
      authError: false,
    });

    const intlResponse = NextResponse.next();
    intlHandler.mockReturnValueOnce(intlResponse);

    const req = requestTo("http://localhost:3000/pt-BR/login");

    const res = await proxy(req);

    expect(res).toBe(intlResponse);
    expect(res.cookies.get("sb-test")?.value).toBe("cookie-value");
  });

  it("pula sessão Supabase em rotas públicas de página", async () => {
    const intlResponse = NextResponse.next();
    intlHandler.mockReturnValueOnce(intlResponse);

    const req = requestTo("http://localhost:3000/pt-BR/agendar");

    const res = await proxy(req);

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(res).toBe(intlResponse);
  });

  it("não trata falha transitória de auth como logout em rota protegida", async () => {
    const supabaseResponse = NextResponse.next();
    supabaseResponse.cookies.set("sb-test", "cookie-value", { path: "/" });
    const intlResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      supabaseResponse,
      user: null,
      authError: true,
    });
    intlHandler.mockReturnValueOnce(intlResponse);

    const req = requestTo("http://localhost:3000/pt-BR/dashboard");

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-auth-refresh-error")).toBe("1");
    expect(res.cookies.get("sb-test")?.value).toBe("cookie-value");
  });
});
