import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulator",
  description: "event_generator / event_receiver 테스트 모니터링 UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
