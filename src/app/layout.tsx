import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";

export const metadata: Metadata = {
  title: "Agency ERP | 마케팅 에이전시 관리 시스템",
  description: "인플루언서 마케팅 에이전시를 위한 통합 관리 시스템",
  keywords: ["ERP", "마케팅", "에이전시", "인플루언서", "캠페인 관리"],
  // 검색엔진 인덱싱 차단
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  verification: {
    google: "6QTaCvQm09qABvK4o6F7n3Fy-W0jlxRLyBbo-0TW-Ws",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
