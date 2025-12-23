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
        <SiteHeader />

        <main className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-140px)]">
          {children}
        </main>

        <footer className="border-t border-border/40 bg-background py-6">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Intern Journal. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
