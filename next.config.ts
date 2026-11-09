import type { NextConfig } from "next";
import { backendUrl } from "./src/config/env";

/** 백엔드 주소: .env.local의 BACKEND_URL, 없으면 http://localhost:8080 (src/config/env.ts) */
const BACKEND_URL = backendUrl();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /**
   * 개발 프록시: 브라우저는 같은 출처(localhost:3000)의 /api/* 만 부르고, Next 서버가 백엔드로 넘긴다.
   * 넘기기 전에 src/proxy.ts가 Origin 머리글을 빼서, 백엔드의 CORS 허용 목록(app.cors.allowed-origins)과 상관없이 붙는다.
   *   /api/inputs/validate → {BACKEND_URL}/api/inputs/validate
   * 프록시는 30초 안에 답이 없으면 500을 돌려준다 → 화면에는 '백엔드가 응답하지 않아요'.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
