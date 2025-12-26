import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Handle OAuth errors
    if (error) {
        console.error('GitHub OAuth error:', error);
        return NextResponse.redirect(`${baseUrl}/write?github_error=${error}`);
    }

    // Verify state
    const storedState = request.cookies.get('github_oauth_state')?.value;
    if (!state || state !== storedState) {
        console.error('State mismatch:', { state, storedState });
        return NextResponse.redirect(`${baseUrl}/write?github_error=state_mismatch`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/write?github_error=no_code`);
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('Token exchange error:', tokenData);
            return NextResponse.redirect(`${baseUrl}/write?github_error=${tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        // Get GitHub user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        const githubUser = await userResponse.json();

        // Get current Supabase user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('User not authenticated:', authError);
            return NextResponse.redirect(`${baseUrl}/login?redirectTo=/write`);
        }

        // Upsert GitHub token
        const { error: upsertError } = await supabase
            .from('github_tokens')
            .upsert({
                user_id: user.id,
                access_token: accessToken,
                github_username: githubUser.login,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (upsertError) {
            console.error('Error saving GitHub token:', upsertError);
            return NextResponse.redirect(`${baseUrl}/write?github_error=db_error`);
        }

        // Clear state cookie and redirect to write page
        const response = NextResponse.redirect(`${baseUrl}/write?github_connected=true`);
        response.cookies.delete('github_oauth_state');

        return response;

    } catch (err) {
        console.error('GitHub OAuth callback error:', err);
        return NextResponse.redirect(`${baseUrl}/write?github_error=server_error`);
    }
}
