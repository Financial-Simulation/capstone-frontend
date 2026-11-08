import type { Metadata } from "next";
import { ResultScreen } from "./ResultScreen";

export const metadata: Metadata = { title: "결과 확인" };

/** 04 결과 확인 */
export default function ResultPage() {
  return <ResultScreen />;
}
