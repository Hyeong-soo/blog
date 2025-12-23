'use client';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function JournalCard({ journal }) {
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async () => {
        const confirmed = window.confirm('정말 삭제하시겠습니까?');
        if (!confirmed) return;

        const { error } = await supabase
            .from('journals')
            .delete()
            .eq('id', journal.id);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            router.refresh(); // Refresh page to remove deleted item
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{journal.title}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                    {new Date(journal.created_at).toLocaleDateString()}
                </span>
            </div>
            <p className="text-gray-600 line-clamp-2 mb-4">
                {journal.content}
            </p>

            <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">#Daily</span>

                <div className="flex gap-2 text-sm">
                    <Link
                        href={`/edit/${journal.id}`}
                        className="text-gray-500 hover:text-black transition"
                    >
                        수정
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-600 transition"
                    >
                        삭제
                    </button>
                </div>
            </div>
        </div>
    );
}
