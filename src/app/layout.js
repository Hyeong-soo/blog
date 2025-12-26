import Link from 'next/link';
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: {
    default: "인턴일기 - AI 기반 일기 작성 플랫폼",
    template: "%s | 인턴일기"
  },
  description: "AI가 도와주는 스마트한 일기 작성 경험. 개발 일지, TIL, 회고록을 손쉽게 기록하고 관리하세요.",
  keywords: ["일기", "개발 일지", "TIL", "AI", "일기장", "회고록", "인턴", "인턴일기"],
  authors: [{ name: "인턴일기 팀" }],
  openGraph: {
    title: "인턴일기 - AI 기반 일기 작성 플랫폼",
    description: "AI가 도와주는 스마트한 일기 작성 경험",
    type: "website",
    locale: "ko_KR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
