import { createClient } from '@/utils/supabase/server';

export default async function sitemap() {
    const supabase = await createClient();

    // 공개된 저널 목록 가져오기
    const { data: journals } = await supabase
        .from('journals')
        .select('id, created_at, updated_at')
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

    const baseUrl = 'https://internjournal.vercel.app';

    // 정적 페이지
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    // 동적 저널 페이지
    const journalPages = (journals || []).map((journal) => ({
        url: `${baseUrl}/journal/${journal.id}`,
        lastModified: new Date(journal.updated_at || journal.created_at),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...staticPages, ...journalPages];
}
