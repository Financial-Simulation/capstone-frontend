import type { Metadata } from "next";
import { ExampleScreen } from "./ExampleScreen";

export const metadata: Metadata = { title: "예시 결과" };

/** 04-E 예시 결과. 예시 값은 내 입력(simInput.v1)에 넣지 않는다 */
export default function ExamplePage() {
  return <ExampleScreen />;
}
