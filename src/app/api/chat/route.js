import { openai } from '@ai-sdk/openai';

import { streamText, tool, convertToModelMessages, experimental_generateImage } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 30;

export async function POST(req) {
    const json = await req.json();
    const messages = json.messages || [];
    const conversationIdParam = json.conversationId;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    let conversationId = conversationIdParam;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user' && conversationId) {
        await supabase.from('messages').insert({
            conv_id: conversationId,
            role: 'user',
            content: lastMessage.content,
        });
    }

    // Polyfill to ensure 'parts' exists for ai SDK
    const normalizedMessages = messages.map(m => {
        if (!m.parts && typeof m.content === 'string') {
            return {
                ...m,
                parts: [{ type: 'text', text: m.content }]
            };
        }
        return m;
    });

    const result = streamText({
        model: openai('gpt-4o'),
        messages: await convertToModelMessages(normalizedMessages),
        system: `You are a friendly and helpful diary assistant. You help the user write their daily journal.
    - Encourage them to express their feelings and thoughts.
    - If they ask for a thumbnail or image, use the generateImage tool.
    - Formatting: modify the response with simple markdown if needed (bold, italic).
    - CRITICAL: You MUST respond in plain text. NEVER return JSON, XML, or structured data. Do not include internal thought processes.`,
        tools: {
            generateImage: tool({
                description: 'Generate a thumbnail image for the diary entry based on a prompt. call this tool when the user asks for an image.',
                inputSchema: z.object({
                    prompt: z.string().describe('The detailed prompt for the image generation'),
                }),
                execute: async ({ prompt }) => {
                    console.log('Generating image for prompt:', prompt);
                    try {
                        const { image } = await experimental_generateImage({
                            model: openai.image('gpt-image-1.5'),
                            prompt: prompt,
                            size: '1024x1024',
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
                if (text) {
                    await supabase.from('messages').insert({
                        conv_id: conversationId,
                        role: 'assistant',
                        content: text,
                        type: 'text',
                    });
                }
                if (toolResults) {
                    for (const result of toolResults) {
                        if (result.toolName === 'generateImage') {
                            await supabase.from('messages').insert({
                                conv_id: conversationId,
                                role: 'assistant',
                                content: result.result.url,
                                type: 'image',
                            });
                        }
                    }
                }
            }
        },
    });

    return result.toUIMessageStreamResponse();
}
