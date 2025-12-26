import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json(
            { error: 'GitHub OAuth not configured' },
            { status: 500 }
        );
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in a cookie for verification
    const response = NextResponse.redirect(
        `https://github.com/login/oauth/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')}/api/github/callback&` +
        `scope=repo user:email&` +
        `state=${state}`
    );

    response.cookies.set('github_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
    });

    return response;
}
