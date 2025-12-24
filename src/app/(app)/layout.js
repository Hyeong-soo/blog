export default function AppLayout({ children }) {
    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden bg-background">
            {children}
        </div>
    );
}
