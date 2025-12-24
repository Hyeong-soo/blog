import { openai } from '@ai-sdk/openai';
import { streamText, tool, experimental_generateImage } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 30;

export async function POST(req) {
    const json = await req.json();
    const { messages = [], model, webSearch } = json;
    const conversationIdParam = json.conversationId;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    let conversationId = conversationIdParam;
    if (!conversationId) {
        conversationId = crypto.randomUUID();
    }

    // Ensure conversation exists
    const { data: existingConv, error: fetchConvError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();

    if (fetchConvError && fetchConvError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching conversation:', fetchConvError);
    }

    if (!existingConv) {
        const { error: insertConvError } = await supabase
            .from('conversations')
            .insert({
                id: conversationId,
                user_id: user.id,
                title: messages[0]?.content?.substring(0, 50) || 'New Conversation',
            });

        if (insertConvError) {
            console.error('Error creating conversation:', insertConvError);
        } else {
            console.log('Conversation created:', conversationId);
        }
    }

    // Get current max seq for this conversation
    const { data: maxSeqData } = await supabase
        .from('messages')
        .select('seq')
        .eq('conv_id', conversationId)
        .order('seq', { ascending: false })
        .limit(1)
        .single();

    let currentSeq = maxSeqData?.seq ?? -1;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user' && conversationId) {
        currentSeq++;
        const { error: msgInsertError } = await supabase.from('messages').insert({
            conv_id: conversationId,
            role: 'user',
            content: typeof lastMessage.content === 'string' ? lastMessage.content : 'Message with attachment',
            type: 'text',
            seq: currentSeq
        });

        if (msgInsertError) {
            console.error('Error inserting user message:', msgInsertError);
        }
    }

    const result = streamText({
        model: openai(model || 'gpt-4o'), // Use passed model or default
        messages: messages.map(m => ({
            role: m.role,
            content: m.content ?? "",
        })),
        system: `You are a friendly and helpful diary assistant. You help the user write their daily journal.
    - Encourage them to express their feelings and thoughts.
    - If they ask for a thumbnail or image, use the generateImage tool.
    - Formatting: use regular Markdown primarily (bold, italic, lists).
    - Style: Adopt a "Notion-style" clean and structured format. Use headings, bullet points, and clear separation of sections.
    - Math formulas: ALWAYS use LaTeX for math.
      - Inline: Use single dollar signs, e.g., $E=mc^2$
      - Block: Use double dollar signs, e.g., $$E=mc^2$$`,
        tools: {
            generateImage: tool({
                description: 'Generate a thumbnail image for the diary entry based on a prompt. call this tool when the user asks for an image.',
                inputSchema: z.object({
                    prompt: z.string().describe('The detailed prompt for the image generation'),
                }),
                execute: async ({ prompt }) => {
                    const styleRules = "Childhood crayon drawing style, elementary school student's hand-drawn diary illustration, bright and vibrant colors, rough texture of crayons and colored pencils, simple and cute characters, childlike perspective, no text, white paper background, innocent and pure atmosphere, high quality crayon texture.";
                    const enhancedPrompt = `${styleRules} Subject of drawing: ${prompt}`;

                    try {
                        const { image } = await experimental_generateImage({
                            model: openai.image('gpt-image-1.5'),
                            prompt: enhancedPrompt,
                            size: '1536x1024',
                        });

                        const buffer = Buffer.from(image.base64, 'base64');

                        const fileName = `generated/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                        const { error: uploadError } = await supabase
                            .storage
                            .from('images')
                            .upload(fileName, buffer, { contentType: 'image/png' });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase
                            .storage
                            .from('images')
                            .getPublicUrl(fileName);

                        return { url: publicUrl, prompt };
                    } catch (error) {
                        console.error('Image Gen Error:', error);
                        return { url: 'https://placehold.co/600x400?text=Error+Generating+Image', prompt };
                    }
                },
            }),
        },
        onFinish: async ({ text, toolCalls, toolResults }) => {
            if (conversationId) {
                // Get latest seq again in case of parallel requests
                const { data: latestSeq } = await supabase
                    .from('messages')
                    .select('seq')
                    .eq('conv_id', conversationId)
                    .order('seq', { ascending: false })
                    .limit(1)
                    .single();

                let assistantSeq = latestSeq?.seq ?? -1;

                if (text) {
                    assistantSeq++;
                    const { error: assistantMsgError } = await supabase.from('messages').insert({
                        conv_id: conversationId,
                        role: 'assistant',
                        content: text,
                        type: 'text',
                        seq: assistantSeq
                    });
                    if (assistantMsgError) {
                        console.error('Error inserting assistant text message:', assistantMsgError);
                    }
                }
                if (toolResults && toolResults.length > 0) {
                    for (const toolResult of toolResults) {
                        if (toolResult.toolName === 'generateImage' && toolResult.output) {
                            assistantSeq++;
                            const { error: imageMsgError } = await supabase.from('messages').insert({
                                conv_id: conversationId,
                                role: 'assistant',
                                content: toolResult.output.url,
                                type: 'image',
                                seq: assistantSeq
                            });
                            if (imageMsgError) {
                                console.error('Error inserting assistant image message:', imageMsgError);
                            }
                        }
                    }
                }
            }
        },
    });

    return result.toUIMessageStreamResponse({
        sendSources: true,
        sendReasoning: true,
    });
}
