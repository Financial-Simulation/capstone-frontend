import type { Metadata } from "next";
import { ScenarioStep } from "@/features/input/scenario/ScenarioStep";

export const metadata: Metadata = { title: "시나리오 선택" };

export default function ScenarioPage() {
  return <ScenarioStep />;
}
