import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Remove GitHub token from user metadata
        const { error } = await supabase.auth.updateUser({
            data: {
                github_access_token: null,
                github_username: null,
            }
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting GitHub:', error);
        return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
    }
}
