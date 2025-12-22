import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

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
            <div key={journal.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{journal.title}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                  {new Date(journal.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 line-clamp-2">
                {journal.content}
              </p>
              <div className="mt-4 flex gap-2">
                {/* Tags are not in schema yet, using static placeholder or removing */}
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">#Daily</span>
              </div>
            </div>
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
