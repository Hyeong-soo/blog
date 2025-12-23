import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import DeleteJournalButton from '@/components/DeleteJournalButton';

export const dynamic = 'force-dynamic';

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
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">일지를 찾을 수 없습니다.</h1>
                <Link href="/" className="text-blue-500 hover:underline">
                    홈으로 돌아가기
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <Link href="/" className="text-sm text-gray-500 hover:text-black transition">
                    ← 뒤로 가기
                </Link>
                <div className="flex gap-2 text-sm">
                    <Link
                        href={`/edit/${journal.id}`}
                        className="text-gray-500 hover:text-black transition"
                    >
                        수정
                    </Link>
                    <DeleteJournalButton journalId={journal.id} />
                </div>
            </div>

            <article className="bg-white p-8 rounded-lg shadow-sm border">
                <header className="mb-6 pb-6 border-b">
                    <h1 className="text-3xl font-bold mb-3">{journal.title}</h1>
                    <div className="flex items-center text-gray-500 text-sm">
                        <span>{new Date(journal.created_at).toLocaleDateString()}</span>
                        <span className="mx-2">•</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">#Daily</span>
                    </div>
                </header>

                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {journal.content}
                </div>
            </article>
        </div>
    );
}
