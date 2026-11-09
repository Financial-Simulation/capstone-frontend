import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIENT_MESSAGES, request } from "./client";
import { ApiError } from "./errors";

function respond(status: number, body: unknown, contentType = "application/json") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return vi.fn(async () => new Response(text, { status, headers: { "Content-Type": contentType } }));
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("실패해야 하는데 성공했다");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiResponse 풀기", () => {
  it("성공이면 result만", async () => {
    const fetchMock = respond(200, { isSuccess: true, code: "COMMON200", message: "성공입니다.", result: { ok: 1 } });
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("POST", "/inputs/validate", { step: "BASIC", input: {} })).resolves.toEqual({ ok: 1 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/inputs/validate");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"step":"BASIC","input":{}}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("GET은 본문 없이", async () => {
    const fetchMock = respond(200, { isSuccess: true, code: "COMMON200", message: "", result: [] });
    vi.stubGlobal("fetch", fetchMock);
    await request("GET", "/events/presets");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("COMMON400이면 칸별 메시지를 같이", async () => {
    vi.stubGlobal(
      "fetch",
      respond(400, {
        isSuccess: false,
        code: "COMMON400",
        message: "잘못된 요청입니다.",
        result: { "person.age": "19~39 사이로 입력해 주세요" },
      }),
    );
    const error = await failure(request("POST", "/inputs/validate", {}));
    expect(error.code).toBe("COMMON400");
    expect(error.status).toBe(400);
    expect(error.message).toBe("잘못된 요청입니다.");
    expect(error.fieldErrors).toEqual({ "person.age": "19~39 사이로 입력해 주세요" });
  });

  it("비즈니스 오류는 result가 null", async () => {
    vi.stubGlobal(
      "fetch",
      respond(400, { isSuccess: false, code: "INPUT4001", message: "경력은 나이 − 15년을 넘을 수 없어요.", result: null }),
    );
    const error = await failure(request("POST", "/inputs/validate", {}));
    expect(error.code).toBe("INPUT4001");
    expect(error.fieldErrors).toEqual({});
  });

  it("백엔드가 꺼져 있으면 (프록시가 JSON이 아닌 500)", async () => {
    vi.stubGlobal("fetch", respond(500, "Internal Server Error", "text/plain"));
    const error = await failure(request("GET", "/examples"));
    expect(error.code).toBe("BACKEND_UNAVAILABLE");
    expect(error.message).toBe(CLIENT_MESSAGES.backendUnavailable);
  });

  it("백엔드의 COMMON500은 그대로", async () => {
    vi.stubGlobal("fetch", respond(500, { isSuccess: false, code: "COMMON500", message: "서버 내부 오류입니다.", result: null }));
    const error = await failure(request("GET", "/examples"));
    expect(error.code).toBe("COMMON500");
  });

  it("ApiResponse가 아닌 응답", async () => {
    vi.stubGlobal("fetch", respond(404, "<html>Not Found</html>", "text/html"));
    expect((await failure(request("GET", "/nope"))).code).toBe("BAD_RESPONSE");
  });

  it("네트워크 오류", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await failure(request("GET", "/examples"));
    expect(error.code).toBe("NETWORK");
    expect(error.status).toBeNull();
  });

  it("취소(AbortController)는 ApiError로 바꾸지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "AbortError");
      }),
    );
    await expect(request("GET", "/examples")).rejects.toMatchObject({ name: "AbortError" });
  });
});
