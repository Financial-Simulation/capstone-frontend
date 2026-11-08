/**
 * 환경 설정은 여기 한 곳에서만 읽어요. 항목과 기본값은 .env.example에 적어 두었어요.
 *
 *  - 값을 바꾸려면 .env.local에 그 줄만 적어요 (git에 올라가지 않아요). 바꾼 뒤에는 npm run dev를 다시 켜요.
 *  - NEXT_PUBLIC_* 는 빌드할 때 `process.env.NEXT_PUBLIC_이름`이 글자 그대로 값으로 바뀌어 브라우저 코드에 들어가요.
 *    그래서 꼭 이 모양으로 읽어요 (구조 분해나 process.env[name]으로 읽으면 브라우저에서는 비어 있어요).
 *  - next.config.ts도 이 파일의 backendUrl()을 써요. 그래서 여기서는 다른 파일을 import하지 않아요.
 */

/** 백엔드 기본 주소: 로컬에서 ./gradlew bootRun으로 켠 Spring Boot */
export const DEFAULT_BACKEND_URL = "http://localhost:8080";

/**
 * 개발 서버가 /api/* 를 넘길 백엔드 주소 (.env.local의 BACKEND_URL).
 * 서버에서만 읽혀요 (next.config.ts · 서버 컴포넌트). 브라우저는 이 주소를 모르고 같은 출처의 /api만 불러요.
 */
export function backendUrl(): string {
  return (process.env.BACKEND_URL?.trim() || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
}

/**
 * 브라우저가 부르는 API 주소 (.env.local의 NEXT_PUBLIC_API_BASE). 기본은 같은 출처의 /api.
 * 백엔드를 다른 주소에서 직접 부를 때만 바꿔요 (그때는 백엔드에서 CORS를 열어야 해요).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || "/api";

/**
 * 목업 스위치 글자 (.env.local의 NEXT_PUBLIC_API_MODE). 비어 있으면 전부 실제 API.
 * 예) "all-mock" (백엔드 없이 화면만 볼 때), "simulate=mock,robust=mock". 읽는 법은 src/lib/api/mode.ts.
 */
export const API_MODE_SPEC = process.env.NEXT_PUBLIC_API_MODE?.trim() ?? "";

/** 개발 서버(next dev)인지. 배포 빌드(next build)에서는 false라서 개발 점검 링크 같은 걸 숨긴다 */
export const IS_DEV = process.env.NODE_ENV !== "production";
