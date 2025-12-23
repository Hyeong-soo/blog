'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DeleteJournalButton({ journalId }) {
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async () => {
        const confirmed = window.confirm('정말 삭제하시겠습니까?');
        if (!confirmed) return;

        const { error } = await supabase
            .from('journals')
            .delete()
            .eq('id', journalId);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            // If we are on the detail page, we usually want to go back to home after delete
            router.push('/');
            router.refresh();
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 transition"
        >
            삭제
        </button>
    );
}
