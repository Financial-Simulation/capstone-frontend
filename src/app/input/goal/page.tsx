import type { Metadata } from "next";
import { GoalStep } from "@/features/input/goal/GoalStep";

export const metadata: Metadata = { title: "목표 설정" };

export default function GoalPage() {
  return <GoalStep />;
}
