'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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
        const userName = user.user_metadata?.name;
        const displayName = userName ? `${userName} 인턴` : user.email?.split('@')[0];

        return (
            <div className="flex items-center gap-2">
                <Link
                    href="/mypage"
                    className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity px-2 py-1 rounded-md hover:bg-primary-foreground/10"
                >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{displayName}</span>
                </Link>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground"
                    onClick={handleLogout}
                >
                    로그아웃
                </Button>
            </div>
        );
    }

    return (
        <Button variant="ghost" size="sm" asChild className="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground">
            <Link href="/login">
                로그인
            </Link>
        </Button>
    );
}
