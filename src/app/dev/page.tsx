import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { backendUrl, devToolsEnabled } from "@/config/env";
import { DevPanel } from "./DevPanel";

/** 닫혀 있을 때(배포 빌드)는 제목도 '개발 점검'을 내보내지 않는다 */
export const metadata: Metadata = devToolsEnabled() ? { title: "개발 점검", robots: { index: false } } : {};

/**
 * 개발 점검 (목업 스위치 · API 점검 · 정답 파일 대조 · 저장값 · 금액 칸). 발표 화면에는 넣지 않는다.
 * 배포 빌드에서는 NEXT_PUBLIC_DEV_TOOLS=1일 때만 열리고, 아니면 '없는 화면' (src/config/env.ts).
 */
export default function DevPage() {
  if (!devToolsEnabled()) notFound();
  return <DevPanel backendUrl={backendUrl()} />;
}
