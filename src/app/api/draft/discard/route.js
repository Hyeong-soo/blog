import { createClient } from '@/utils/supabase/server';

export async function POST(req) {
    const { conversationId, journalId, isDraft } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Delete messages first (child records)
        if (conversationId) {
            const { error: msgDeleteError } = await supabase
                .from('messages')
                .delete()
                .eq('conv_id', conversationId);

            if (msgDeleteError) {
                console.error('Error deleting messages:', msgDeleteError);
            }

            // Delete conversation
            const { error: convDeleteError } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId)
                .eq('user_id', user.id); // Security: only delete own conversations

            if (convDeleteError) {
                console.error('Error deleting conversation:', convDeleteError);
            }
        }

        // If it's a draft journal, delete it too
        if (journalId && isDraft) {
            const { error: journalDeleteError } = await supabase
                .from('journals')
                .delete()
                .eq('id', journalId)
                .eq('is_draft', true); // Only delete if it's actually a draft

            if (journalDeleteError) {
                console.error('Error deleting draft journal:', journalDeleteError);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Discard error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
