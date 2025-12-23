'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function AuthButton() {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // 1. Check initial session
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        };
        checkUser();

        // 2. Listen for changes (login, logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (_event === 'SIGNED_OUT') {
                router.refresh(); // Refresh server components if needed
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // State update happens automatically via onAuthStateChange
    };

    if (user) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden sm:inline">{user.email}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-primary-foreground/80"
                    onClick={handleLogout}
                >
                    로그아웃
                </Button>
            </div>
        );
    }

    return (
        <Button variant="ghost" size="sm" asChild className="hover:text-primary-foreground/80">
            <Link href="/login">
                로그인
            </Link>
        </Button>
    );
}
