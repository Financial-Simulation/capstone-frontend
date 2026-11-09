import type { Metadata } from "next";
import { BasicStep } from "@/features/input/basic/BasicStep";

export const metadata: Metadata = { title: "나와 소득/지출" };

export default function BasicPage() {
  return <BasicStep />;
}
