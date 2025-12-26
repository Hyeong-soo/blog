import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import DeleteJournalButton from '@/components/DeleteJournalButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import TiptapViewer from '@/components/editor/tiptap-viewer';


import { ArrowLeft, Edit } from 'lucide-react'; // Assuming lucide-react is available as it's default for shadcn

export const dynamic = 'force-dynamic';

// 동적 SEO 메타데이터 생성
export async function generateMetadata({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: journal } = await supabase
        .from('journals')
        .select('title, content, thumbnail_url, created_at')
        .eq('id', id)
        .single();

    if (!journal) {
        return {
            title: '일기를 찾을 수 없습니다',
        };
    }

    // content에서 HTML 태그 제거하고 설명 생성
    const plainText = journal.content?.replace(/<[^>]*>/g, '') || '';
    const description = plainText.slice(0, 160) + (plainText.length > 160 ? '...' : '');

    return {
        title: journal.title,
        description: description || `${journal.title} - 인턴일기`,
        openGraph: {
            title: journal.title,
            description: description || `${journal.title} - 인턴일기`,
            type: 'article',
            publishedTime: journal.created_at,
            ...(journal.thumbnail_url && {
                images: [{ url: journal.thumbnail_url, width: 1200, height: 630 }],
            }),
        },
        twitter: {
            card: journal.thumbnail_url ? 'summary_large_image' : 'summary',
            title: journal.title,
            description: description,
            ...(journal.thumbnail_url && { images: [journal.thumbnail_url] }),
        },
    };
}


export default async function JournalDetailPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: journal, error } = await supabase
        .from('journals')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !journal) {
        return (
            <div className="container mx-auto px-4 py-8 text-center mt-20">
                <h1 className="text-2xl font-bold mb-4">일지를 찾을 수 없습니다.</h1>
                <Button asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        홈으로 돌아가기
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-10 pb-20">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <Button variant="ghost-flush" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        목록으로
                    </Link>
                </Button>

                <div className="flex gap-2">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/edit/${journal.id}`} aria-label="수정">
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    <DeleteJournalButton journalId={journal.id} />
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="shadow-lg">
                <CardHeader className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-3xl font-bold leading-tight">
                            {journal.title}
                        </CardTitle>
                        {journal.is_draft ? (
                            <Badge variant="secondary" className="w-fit text-sm px-3 py-1">
                                임시저장
                            </Badge>
                        ) : (
                            <Badge variant="default" className="w-fit text-sm px-3 py-1">
                                Daily
                            </Badge>
                        )}
                    </div>
                    <CardDescription className="text-base text-muted-foreground">
                        {new Date(journal.created_at).toLocaleDateString()} • {new Date(journal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </CardDescription>
                </CardHeader>

                {journal.thumbnail_url && (
                    <div className="w-full aspect-video relative overflow-hidden border-b">
                        <img src={journal.thumbnail_url} alt={journal.title} className="w-full h-full object-cover" />
                    </div>
                )}

                <Separator />

                <CardContent className="pt-8">
                    <div className="w-full">
                        <TiptapViewer content={journal.content} />
                    </div>
                </CardContent>

                <CardFooter className="bg-background mt-5 mb-0 mx-6 p-0 rounded-b-xl flex justify-between items-center text-sm text-muted-foreground">
                    <span>작성일: {new Date(journal.created_at).toLocaleDateString()}</span>
                    {/* Placeholder for future features like 'word count' or 'views' */}
                    <span>{journal.is_draft ? '임시저장됨' : '기록 완료'}</span>
                </CardFooter>
            </Card>
        </div>
    );
}
