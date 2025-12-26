import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD format, defaults to today

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get GitHub token
        const { data: tokenData, error: tokenError } = await supabase
            .from('github_tokens')
            .select('access_token, github_username')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
        }

        const { access_token, github_username } = tokenData;

        // Determine target date (KST timezone)
        let targetDateStr;
        if (dateParam) {
            targetDateStr = dateParam;
        } else {
            // Get current date in KST
            const now = new Date();
            const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
            const year = kstDate.getFullYear();
            const month = String(kstDate.getMonth() + 1).padStart(2, '0');
            const day = String(kstDate.getDate()).padStart(2, '0');
            targetDateStr = `${year}-${month}-${day}`;
        }

        const sinceDate = `${targetDateStr}T00:00:00+09:00`;
        const untilDate = `${targetDateStr}T23:59:59+09:00`;

        // First, get all repos the user has pushed to recently
        const reposResponse = await fetch(
            `https://api.github.com/user/repos?sort=pushed&per_page=30&affiliation=owner,collaborator`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!reposResponse.ok) {
            console.error('Failed to fetch repos:', await reposResponse.text());
            return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
        }

        const repos = await reposResponse.json();

        // Fetch commits from each repo
        const allCommits = [];
        const repoSet = new Set();

        for (const repo of repos) {
            try {
                // URL encode the dates (+ sign needs to be %2B)
                const encodedSince = encodeURIComponent(sinceDate);
                const encodedUntil = encodeURIComponent(untilDate);

                const commitsResponse = await fetch(
                    `https://api.github.com/repos/${repo.full_name}/commits?since=${encodedSince}&until=${encodedUntil}&per_page=50`,
                    {
                        headers: {
                            'Authorization': `Bearer ${access_token}`,
                            'Accept': 'application/vnd.github.v3+json',
                        },
                    }
                );

                if (!commitsResponse.ok) {
                    continue;
                }

                const commits = await commitsResponse.json();

                // Filter to only include commits by the authenticated user
                const userCommits = commits.filter(commit =>
                    commit.author?.login?.toLowerCase() === github_username.toLowerCase() ||
                    commit.committer?.login?.toLowerCase() === github_username.toLowerCase()
                );

                if (userCommits.length > 0) {
                    repoSet.add(repo.full_name);

                    for (const commit of userCommits) {
                        allCommits.push({
                            sha: commit.sha?.substring(0, 7),
                            message: commit.commit?.message?.split('\n')[0] || 'No message',
                            repo: repo.full_name,
                            timestamp: commit.commit?.author?.date,
                            url: commit.html_url,
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching commits from ${repo.full_name}:`, err);
                // Continue with other repos
            }
        }

        // Sort by timestamp (newest first)
        allCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return NextResponse.json({
            date: targetDateStr,
            username: github_username,
            totalCommits: allCommits.length,
            repositories: Array.from(repoSet),
            commits: allCommits,
        });

    } catch (err) {
        console.error('Error fetching commits:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
