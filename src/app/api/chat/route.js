import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req) {
    const { messages, conversationId: conversationIdParam } = await req.json();
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Ensure conversation exists or create one
    let conversationId = conversationIdParam;
    if (!conversationId) {
        // Check if we have a conversation for today/this session?
        // For now, if no ID provided, we assume client will handle or we create a new one.
        // However, usually the client `useChat` generates a random ID, but we want a persistent DB ID.
        // We'll trust the client to pass one or we creates a new one and client needs to know it.
        // Limitation of `useChat` without extra roundtrip: usually we start with a generated UUID.
        // Let's assume the client passes a UUID.
    }

    // Save the LAST user message to DB (others are already saved theoretically, but duplicates might happen if we re-send whole history.
    // A better pattern is to save NEW messages only.
    // The `messages` array contains the full history. We only want to save the new user message.
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user' && conversationId) {
        await supabase.from('messages').insert({
            conv_id: conversationId,
            role: 'user',
            content: lastMessage.content,
        });
    }

    return streamText({
        model: google('gemini-1.5-pro-latest'),
        messages,
        system: `You are a friendly and helpful diary assistant. You help the user write their daily journal.
    - Encourage them to express their feelings and thoughts.
    - If they ask for a thumbnail or image, use the generateImage tool.
    - Formatting: modify the response with simple markdown if needed (bold, italic).`,
        tools: {
            generateImage: tool({
                description: 'Generate a thumbnail image for the diary entry based on a prompt.',
                parameters: z.object({
                    prompt: z.string().describe('The prompt for the image generation'),
                }),
                execute: async ({ prompt }) => {
                    console.log('Generating image for prompt:', prompt);

                    try {
                        // 1. Generate Image (Mocking with Unsplash source for reliability/demo as we don't have DALL-E key guaranteed)
                        // In production, replace with: const response = await openai.images.generate(...) or Google Imagen
                        const imageUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(prompt)}`;

                        // 2. Fetch the image to upload to Supabase
                        const imageRes = await fetch(imageUrl);
                        if (!imageRes.ok) throw new Error('Failed to fetch image source');
                        const blob = await imageRes.blob();
                        const buffer = await blob.arrayBuffer();

                        // 3. Upload to Supabase Storage
                        const fileName = `generated/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                        const { error: uploadError } = await supabase
                            .storage
                            .from('images')
                            .upload(fileName, buffer, {
                                contentType: 'image/jpeg',
                            });

                        if (uploadError) throw uploadError;

                        // 4. Get Public URL
                        const { data: { publicUrl } } = supabase
                            .storage
                            .from('images')
                            .getPublicUrl(fileName);

                        return { url: publicUrl, prompt };
                    } catch (error) {
                        console.error('Image Gen Error:', error);
                        // Fallback to a static placeholder if everything fails
                        return { url: 'https://placehold.co/600x400?text=Error+Generating+Image', prompt };
                    }
                },
            }),
        },
        onFinish: async ({ text, toolCalls, toolResults }) => {
            if (conversationId) {
                // Save assistant text response
                if (text) {
                    await supabase.from('messages').insert({
                        conv_id: conversationId,
                        role: 'assistant',
                        content: text,
                        type: 'text',
                    });
                }

                // Save tool results (images)
                // toolResults is an array. We check for 'generateImage'
                if (toolResults) {
                    for (const result of toolResults) {
                        if (result.toolName === 'generateImage') {
                            await supabase.from('messages').insert({
                                conv_id: conversationId,
                                role: 'assistant',
                                content: result.result.url, // Store URL as content
                                type: 'image',
                            });
                        }
                    }
                }
            }
        },
    });
}
