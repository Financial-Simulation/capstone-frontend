import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKEND_URL, backendUrl } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("백엔드 주소 (BACKEND_URL)", () => {
  it("없으면 로컬 Spring Boot", () => {
    vi.stubEnv("BACKEND_URL", "");
    expect(backendUrl()).toBe(DEFAULT_BACKEND_URL);
    expect(DEFAULT_BACKEND_URL).toBe("http://localhost:8080");
  });

  it(".env.local 값을 쓰고, 끝의 / 와 공백은 뺀다", () => {
    vi.stubEnv("BACKEND_URL", " https://api.example.com/ ");
    expect(backendUrl()).toBe("https://api.example.com");
  });
});
