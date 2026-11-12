import type { Metadata } from "next";
import { StoryScreen } from "@/features/story/StoryScreen";

export const metadata: Metadata = { title: "미래 다시 보기" };

/** 04 데모: 최상 · 중간 · 최악 미래를 한 달씩 다시 보기 */
export default function StoryPage() {
  return <StoryScreen />;
}
