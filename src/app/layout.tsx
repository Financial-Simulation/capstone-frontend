import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "사회초년생 금융 시뮬레이터",
    template: "%s · 사회초년생 금융 시뮬레이터",
  },
  description: "실직이나 급한 지출까지 넣어 목표 금액을 모을 가능성을 계산해 보는 재무 시뮬레이터",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 print:max-w-none print:p-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
