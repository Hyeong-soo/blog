'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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
                <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
                <button
                    onClick={handleLogout}
                    className="hover:text-black cursor-pointer bg-transparent border-none p-0 text-sm font-medium text-gray-600"
                >
                    로그아웃
                </button>
            </div>
        );
    }

    return (
        <Link href="/login" className="hover:text-black text-sm font-medium text-gray-600">
            로그인
        </Link>
    );
}
