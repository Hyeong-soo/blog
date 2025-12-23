'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

export default function WritePage() {
    // Editor State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    // Auth & Routing
    const router = useRouter();
    const supabase = createClient();

    // Chat State (Vercel AI SDK)
    const [conversationId] = useState(() => crypto.randomUUID());
    const [input, setInput] = useState('');

    const chatHelpers = useChat({
        api: '/api/chat',
        body: { conversationId },
        initialMessages: [],
        onResponse: (response) => {
            console.log('Chat Response Status:', response.status);
            console.log('Chat Response Headers:', Object.fromEntries(response.headers.entries()));

            // Debug: Log full response body (cloned to avoid consuming original stream)
            response.clone().text().then(text => {
                console.log('Chat Response Body:', text);
            }).catch(err => {
                console.error('Error reading response body:', err);
            });
        },
        onFinish: (message) => {
            console.log('Chat Finished:', message);
        },
        onError: (error) => {
            console.error('Chat Error:', error);
        }
    });

    const { messages, sendMessage, isLoading: isChatLoading, setMessages } = chatHelpers;

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const content = input;
        setInput('');

        try {
            await sendMessage({ role: 'user', content });
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    // Load conversation history on mount (optional)
    useEffect(() => {
        const loadHistory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
        };
        loadHistory();
    }, []);


    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.from('journals').insert({
            title,
            content,
        });

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            router.push('/');
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-4 h-[calc(100vh-80px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Left Column: Editor */}
                <div className="h-full flex flex-col">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">새 일지 작성</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            <div className="space-y-2">
                                <label htmlFor="title" className="text-sm font-medium">제목</label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="오늘의 배움"
                                />
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col">
                                <label htmlFor="content" className="text-sm font-medium">내용</label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="flex-1 resize-none"
                                    placeholder="오늘은 무엇을 배웠나요?"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="ghost" onClick={() => router.back()}>취소</Button>
                                <Button onClick={handleSave} disabled={loading}>
                                    {loading ? '저장 중...' : '저장하기'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: AI Chat Agent */}
                <div className="h-full flex flex-col">
                    <Card className="h-full flex flex-col border-primary/20 shadow-lg">
                        <CardHeader className="bg-muted/50 pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <span>오늘 뭐 했는지 알려주세요</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                            {/* Chat Messages Area */}
                            <ScrollArea className="flex-1 p-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-muted-foreground mt-10">
                                        <p>일기 쓰는 것을 도와드릴까요?</p>
                                        <p className="text-sm mt-2">"웹 개발 방법론을 학습했어."<br />"AI 에이전트 개념을 배웠어"</p>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    {messages.map(m => (
                                        <Message key={m.id} from={m.role}>
                                            <MessageContent>
                                                {m.content && !m.content.startsWith('http') && (
                                                    <MessageResponse>{m.content}</MessageResponse>
                                                )}
                                                {!m.content && m.parts && m.parts.map((part, i) => (
                                                    part.type === 'text' && (
                                                        <MessageResponse key={i}>{part.text}</MessageResponse>
                                                    )
                                                ))}

                                                {m.toolInvocations?.map(toolInvocation => {
                                                    const { toolName, toolCallId, state } = toolInvocation;

                                                    if (state === 'result') {
                                                        const result = toolInvocation.result;
                                                        if (toolName === 'generateImage') {
                                                            return (
                                                                <div key={toolCallId} className="mt-2">
                                                                    <img
                                                                        src={result.url}
                                                                        alt={result.prompt}
                                                                        className="rounded-md w-full max-w-[200px] border border-border"
                                                                    />
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        className="mt-2 w-full text-xs"
                                                                        onClick={() => setContent(prev => prev + `\n\n![Thumbnail](${result.url})`)}
                                                                    >
                                                                        본문에 삽입하기
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    return (
                                                        <div key={toolCallId} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            이미지 생성 중...
                                                        </div>
                                                    );
                                                })}
                                            </MessageContent>
                                        </Message>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="p-4 border-t bg-background">
                                <form
                                    onSubmit={handleChatSubmit}
                                    className="flex gap-2"
                                >
                                    <Input
                                        value={input}
                                        onChange={handleInputChange}
                                        placeholder="AI에게 요청하기..."
                                        className="flex-1"
                                    />
                                    <Button type="submit" disabled={isChatLoading} size="icon">
                                        {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
