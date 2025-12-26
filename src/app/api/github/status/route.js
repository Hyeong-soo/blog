import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ connected: false, error: 'not_authenticated' });
        }

        // Check if user has GitHub token
        const { data: tokenData, error: tokenError } = await supabase
            .from('github_tokens')
            .select('github_username, updated_at')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({
            connected: true,
            username: tokenData.github_username,
            connectedAt: tokenData.updated_at,
        });

    } catch (err) {
        console.error('GitHub status check error:', err);
        return NextResponse.json({ connected: false, error: 'server_error' });
    }
}
