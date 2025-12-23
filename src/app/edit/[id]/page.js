'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function EditPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams(); // Get [id] from URL
    const supabase = createClient();

    useEffect(() => {
        const fetchJournal = async () => {
            const { data, error } = await supabase
                .from('journals')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) {
                console.error('Error fetching journal:', error);
                alert('일지를 불러올 수 없습니다.');
                router.push('/');
            } else {
                setTitle(data.title);
                setContent(data.content);
            }
            setLoading(false);
        };

        if (params.id) fetchJournal();
    }, [params.id, router, supabase]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('journals')
            .update({ title, content })
            .eq('id', params.id);

        if (error) {
            alert('수정 실패: ' + error.message);
        } else {
            alert('수정되었습니다!');
            router.push('/');
            router.refresh(); // Refresh list
        }
        setLoading(false);
    };

    if (loading) return <div className="text-center py-20">로딩 중...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">일지 수정하기</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium leading-none">
                                제목
                            </label>
                            <Input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="content" className="text-sm font-medium leading-none">
                                내용
                            </label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={10}
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.back()}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? '저장 중...' : '수정 완료'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
