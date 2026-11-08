import type { Metadata } from "next";
import { DevPanel } from "./DevPanel";

export const metadata: Metadata = { title: "개발 점검", robots: { index: false } };

/** 개발 점검 (목업 스위치 · API 점검 · 저장값 · 금액 칸). 발표 화면에는 넣지 않는다 */
export default function DevPage() {
  const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  return <DevPanel backendUrl={backendUrl} />;
}
