/**
 * /api/* 요청을 백엔드로 넘기기 전에 브라우저가 붙인 Origin 머리글을 뺀다 (넘기는 일은 next.config.ts의 rewrites).
 *
 * 브라우저는 같은 출처(localhost:3000)의 POST에도 Origin을 붙이고, rewrites는 그 머리글을 그대로 백엔드에 넘긴다.
 * 백엔드(CorsConfig, app.cors.allowed-origins)는 Origin이 자기 주소(localhost:8080)와 다르면 다른 출처의 요청으로 보고,
 * 허용 목록에 없으면 403 "Invalid CORS request"를 돌려준다 (Spring DefaultCorsProcessor). GET에는 Origin이 없어서 POST만 막힌다.
 * Next 서버가 대신 부르는 것이라 브라우저 CORS가 아니므로, 백엔드의 허용 목록과 상관없이 붙도록 Origin을 뺀다.
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("origin");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};
