'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

function LoginForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/';

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
            },
        });

        if (error) {
            setMessage(`에러 발생: ${error.message}`);
        } else {
            setMessage('로그인 링크를 이메일로 보냈습니다! 확인해주세요.');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl text-center">로그인</CardTitle>
                    {redirectTo !== '/' && (
                        <CardDescription className="text-center">
                            로그인 후 요청하신 페이지로 이동합니다
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                이메일 주소
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '전송 중...' : '매직 링크 보내기'}
                        </Button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('에러') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {message}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="max-w-md mx-auto mt-20">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">로그인</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse space-y-4">
                            <div className="h-10 bg-muted rounded"></div>
                            <div className="h-10 bg-muted rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
