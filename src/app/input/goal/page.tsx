import type { Metadata } from "next";
import { GoalStep } from "./GoalStep";

export const metadata: Metadata = { title: "목표 설정" };

export default function GoalPage() {
  return <GoalStep />;
}
