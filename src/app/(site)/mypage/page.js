'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Building2, Github, Check, X, Loader2, Save, ExternalLink } from 'lucide-react';

export default function MyPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile fields
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');

    // GitHub state
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');
    const [disconnecting, setDisconnecting] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const loadUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirectTo=/mypage');
                return;
            }

            setUser(user);

            // Load profile from user_metadata
            const metadata = user.user_metadata || {};
            setName(metadata.name || '');
            setCompany(metadata.company || '');

            // Check GitHub status
            try {
                const response = await fetch('/api/github/status');
                const data = await response.json();
                setGithubConnected(data.connected);
                if (data.username) setGithubUsername(data.username);
            } catch (err) {
                console.error('Error checking GitHub status:', err);
            }

            setLoading(false);
        };

        loadUserData();
    }, [router, supabase]);

    const handleSaveProfile = async () => {
        setSaving(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    name,
                    company,
                }
            });

            if (error) throw error;

            alert('프로필이 저장되었습니다!');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('프로필 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleConnectGithub = () => {
        window.location.href = '/api/github/auth';
    };

    const handleDisconnectGithub = async () => {
        if (!confirm('GitHub 연동을 해제하시겠습니까?')) return;

        setDisconnecting(true);
        try {
            const response = await fetch('/api/github/disconnect', { method: 'POST' });
            if (response.ok) {
                setGithubConnected(false);
                setGithubUsername('');
            } else {
                throw new Error('Failed to disconnect');
            }
        } catch (error) {
            console.error('Error disconnecting GitHub:', error);
            alert('GitHub 연동 해제에 실패했습니다.');
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <Button variant="ghost" size="sm" asChild className="mb-4">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            홈으로
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">마이페이지</h1>
                    <p className="text-muted-foreground mt-1">프로필과 연동 설정을 관리하세요</p>
                </div>

                <div className="space-y-6">
                    {/* Profile Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">인턴 프로필</CardTitle>
                                    <CardDescription>당신의 인턴 정보를 입력하세요</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <Input
                                    id="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">이름</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="홍길동"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        회사 / 팀 이름
                                    </span>
                                </Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="예: Google DeepMind 인턴"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="rounded-full gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {saving ? '저장 중...' : '프로필 저장'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* GitHub Integration Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <Github className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">GitHub 연동</CardTitle>
                                        <CardDescription>개발 일지에 커밋 내역을 가져옵니다</CardDescription>
                                    </div>
                                </div>
                                {githubConnected ? (
                                    <Badge variant="default" className="gap-1">
                                        <Check className="h-3 w-3" />
                                        연결됨
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="gap-1">
                                        <X className="h-3 w-3" />
                                        미연결
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {githubConnected ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <img
                                            src={`https://github.com/${githubUsername}.png`}
                                            alt={githubUsername}
                                            className="h-10 w-10 rounded-full"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium">@{githubUsername}</p>
                                            <p className="text-sm text-muted-foreground">GitHub 계정이 연결되어 있습니다</p>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            일기 작성 시 오늘의 커밋을 자동으로 가져올 수 있습니다
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDisconnectGithub}
                                            disabled={disconnecting}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            {disconnecting ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : null}
                                            연동 해제
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                        <Github className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">GitHub 계정을 연결하세요</p>
                                        <p className="text-sm text-muted-foreground">
                                            오늘의 커밋 내역을 개발 일지에 자동으로 추가할 수 있습니다
                                        </p>
                                    </div>
                                    <Button onClick={handleConnectGithub} className="rounded-full gap-2">
                                        <Github className="h-4 w-4" />
                                        GitHub 연결하기
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
