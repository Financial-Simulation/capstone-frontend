import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 순수 함수(형식·규칙·오류 변환·목업 매칭·저장)만 시험한다. 화면은 브라우저에서 직접 확인.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
