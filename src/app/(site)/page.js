import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import JournalCard from '@/components/JournalCard';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: journals, error } = await supabase
    .from('journals')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching journals:', error);
    return <div className="text-red-500">일지를 불러오는데 실패했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">오늘의 기록</h2>
        {user && (
          <Button variant="default" size="sm" asChild>
            <Link href="/write">
              일기쓰기
            </Link>
          </Button>
        )}
      </section>

      <div className="grid gap-4">
        {journals && journals.length > 0 ? (
          journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border-2 border-dashed border-muted-foreground/20 space-y-6">
            <div className="bg-muted size-16 rounded-full flex items-center justify-center text-muted-foreground/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">아직 작성된 일지가 없네요</h3>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                오늘의 소중한 순간들을 기록하기 시작해보세요. AI가 작성을 도와드립니다.
              </p>
            </div>
            <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all" asChild>
              <Link href="/write">
                첫 번째 일기 쓰기
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
