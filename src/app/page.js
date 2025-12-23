import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import JournalCard from '@/components/JournalCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: journals, error } = await supabase
    .from('journals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching journals:', error);
    return <div className="text-red-500">일지를 불러오는데 실패했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">오늘의 기록</h2>
        <Link
          href="/write"
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition text-sm font-medium"
        >
          + 새 기록 작성
        </Link>
      </section>

      <div className="grid gap-4">
        {journals && journals.length > 0 ? (
          journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center py-12 text-gray-400">
            <p>작성된 일지가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
