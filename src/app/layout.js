import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata = {
  title: {
    default: "인턴일기 - AI 기반 일기 작성 플랫폼",
    template: "%s | 인턴일기"
  },
  description: "AI가 도와주는 스마트한 일기 작성 경험. 개발 일지, TIL, 회고록을 손쉽게 기록하고 관리하세요.",
  keywords: ["일기", "개발 일지", "TIL", "AI", "일기장", "회고록", "인턴", "인턴일기"],
  authors: [{ name: "인턴일기 팀" }],
  creator: "인턴일기",
  publisher: "인턴일기",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "인턴일기 - AI 기반 일기 작성 플랫폼",
    description: "AI가 도와주는 스마트한 일기 작성 경험",
    type: "website",
    locale: "ko_KR",
    siteName: "인턴일기",
  },
  twitter: {
    card: "summary_large_image",
    title: "인턴일기 - AI 기반 일기 작성 플랫폼",
    description: "AI가 도와주는 스마트한 일기 작성 경험",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#393E46',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
