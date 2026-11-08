import type { Metadata } from "next";
import { ReportScreen } from "@/features/report/ReportScreen";

/** 인쇄 창의 PDF 파일 이름이 된다 */
export const metadata: Metadata = { title: "재무 시뮬레이션 리포트" };

/** 04 리포트 저장 (인쇄 · PDF) */
export default function ReportPage() {
  return <ReportScreen />;
}
