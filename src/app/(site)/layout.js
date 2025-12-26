import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
            <SiteHeader />
            <main className="container mx-auto px-4 py-10 max-w-5xl flex-1">
                {children}
            </main>
            <footer className="border-t border-border/20 bg-muted/30 backdrop-blur-sm py-8 mt-auto">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p className="font-medium">© {new Date().getFullYear()} 인턴일기</p>
                        <p>AI와 함께하는 스마트한 일기 작성</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
