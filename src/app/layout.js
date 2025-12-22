import Link from 'next/link';
import "./globals.css";
import AuthButton from '@/components/AuthButton';

export const metadata = {
  title: "Intern Journal",
  description: "인턴 경험 기록장",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">Intern Journal</Link>
            <nav className="flex gap-4 text-sm font-medium text-gray-600 items-center">
              <Link href="/" className="hover:text-black">홈</Link>
              <AuthButton />
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-140px)]">
          {children}
        </main>

        <footer className="border-t bg-white py-6">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Intern Journal. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
