import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouTube 데이터 수집기",
  description: "YouTube 동영상 데이터 수집 및 분석 도구 - 마케팅 담당자를 위한 전문 분석 플랫폼",
  keywords: ["YouTube", "데이터 수집", "동영상 분석", "마케팅", "인플루언서"],
  openGraph: {
    title: "YouTube 데이터 수집기",
    description: "YouTube 동영상 데이터 수집 및 분석 도구",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
