'use client';

import { useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Building2, Sparkles } from 'lucide-react';

// 회사 도메인 매핑 (확장 가능)
const COMPANY_DOMAINS = {
    'google.com': 'Google',
    'meta.com': 'Meta',
    'facebook.com': 'Meta',
    'apple.com': 'Apple',
    'amazon.com': 'Amazon',
    'microsoft.com': 'Microsoft',
    'netflix.com': 'Netflix',
    'naver.com': '네이버',
    'kakao.com': '카카오',
    'kakaocorp.com': '카카오',
    'coupang.com': '쿠팡',
    'toss.im': '토스',
    'woowahan.com': '우아한형제들',
    'linecorp.com': '라인',
    'samsung.com': '삼성',
    'samsungsds.com': '삼성SDS',
    'lgcns.com': 'LG CNS',
    'sk.com': 'SK',
    'hyundai.com': '현대',
    'krafton.com': '크래프톤',
    'nexon.com': '넥슨',
    'ncsoft.com': 'NC소프트',
    'smilegate.com': '스마일게이트',
};

function getCompanyFromEmail(email) {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    // 직접 매칭
    if (COMPANY_DOMAINS[domain]) return COMPANY_DOMAINS[domain];

    // 부분 매칭 (예: intern@us.google.com)
    for (const [key, company] of Object.entries(COMPANY_DOMAINS)) {
        if (domain.endsWith(key)) return company;
    }

    // 알 수 없는 회사라도 도메인에서 추출
    const parts = domain.split('.');
    if (parts.length >= 2) {
        const companyHint = parts[parts.length - 2];
        // 일반 도메인 제외 (gmail, naver mail 등)
        const commonDomains = ['gmail', 'naver', 'daum', 'hanmail', 'kakao', 'outlook', 'hotmail', 'yahoo', 'icloud'];
        if (!commonDomains.includes(companyHint) && companyHint.length > 2) {
            return companyHint.charAt(0).toUpperCase() + companyHint.slice(1);
        }
    }

    return null;
}

function LoginForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/';

    const detectedCompany = useMemo(() => getCompanyFromEmail(email), [email]);

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
        <div className="max-w-md mx-auto mt-16 px-4">
            <Card className="border-border/50 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">인턴일기 시작하기</CardTitle>
                    <CardDescription className="text-base mt-2">
                        인턴으로 재직 중인 <span className="font-medium text-foreground">회사 메일</span>을 입력해주세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
                                회사 이메일
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="intern@company.com"
                                required
                                className="h-11"
                            />
                            {detectedCompany && (
                                <div className="flex items-center gap-2 text-sm text-primary animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Building2 className="h-4 w-4" />
                                    <span><strong>{detectedCompany}</strong>에서 인턴 중이시군요! 🎉</span>
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-11 rounded-full font-medium" disabled={loading}>
                            {loading ? '전송 중...' : '매직 링크 보내기'}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            입력하신 이메일로 로그인 링크가 발송됩니다
                        </p>
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
            <div className="max-w-md mx-auto mt-16 px-4">
                <Card className="border-border/50 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">인턴일기 시작하기</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse space-y-4">
                            <div className="h-11 bg-muted rounded"></div>
                            <div className="h-11 bg-muted rounded-full"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
