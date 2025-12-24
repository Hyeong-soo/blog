import Link from 'next/link';
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Intern Journal",
  description: "인턴 경험 기록장",
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
