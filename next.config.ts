import type { NextConfig } from "next";

/**
 * 백엔드 주소. 기본은 로컬 Spring Boot(:8080).
 * 다른 주소를 쓰려면 .env.local에 BACKEND_URL=http://... 를 넣는다 (개발 서버를 다시 켜야 적용).
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");

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
   * 백엔드에 CORS 설정이 없어도 붙는다 (브라우저 입장에서는 다른 출처를 부르지 않으니까).
   *   /api/inputs/validate → http://localhost:8080/api/inputs/validate
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
