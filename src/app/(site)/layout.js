import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }) {
    return (
        <>
            <SiteHeader />
            <main className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-140px)]">
                {children}
            </main>
            <footer className="border-t border-border/40 bg-background py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Intern Journal. All rights reserved.
                </div>
            </footer>
        </>
    );
}
