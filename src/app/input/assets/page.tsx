import type { Metadata } from "next";
import { AssetsStep } from "@/features/input/assets/AssetsStep";

export const metadata: Metadata = { title: "자산/대출/저축" };

export default function AssetsPage() {
  return <AssetsStep />;
}
