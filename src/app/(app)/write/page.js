'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import TiptapEditor from "@/components/editor/tiptap-editor";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputHeader,
    PromptInputBody,
    PromptInputTools,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputActionMenu,
    PromptInputActionMenuTrigger,
    PromptInputActionMenuContent,
    PromptInputActionAddAttachments
} from "@/components/ai-elements/prompt-input";
import { Send, Loader2, RefreshCcw, Copy } from 'lucide-react';
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactActions, ArtifactContent } from "@/components/ai-elements/artifact";

export default function WritePage() {
    // Editor State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
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

    const { messages, sendMessage, isLoading: isChatLoading, setMessages, regenerate } = chatHelpers;

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

        console.log('Saving journal:', {
            conversationId,
            messagesCount: messages.length,
            hasMessages: messages.length > 0
        });

        // Only include conversation_id if chat was used
        const journalData = {
            title,
            content,
            thumbnail_url: thumbnailUrl,
        };

        if (messages.length > 0) {
            journalData.conversation_id = conversationId;
        }

        console.log('Journal data to insert:', journalData);

        const { error } = await supabase.from('journals').insert(journalData);

        if (error) {
            console.error('Journal save error:', error);
            alert('저장 실패: ' + error.message);
        } else {
            router.push('/');
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            <div className="flex flex-col lg:flex-row h-full w-full divide-y lg:divide-y-0 lg:divide-x">
                {/* Left Column: AI Chat Agent */}
                <div className="flex-1 lg:w-1/2 h-full flex flex-col bg-sidebar/50 backdrop-blur-sm relative min-w-0">
                    <div className="flex items-center p-4 border-b h-16 bg-background/50 z-20 relative">
                        <h1 className="text-xl font-semibold px-2 tracking-tight">일기쓰기</h1>
                    </div>

                    {/* Chat Area (StickToBottom) */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                        <Conversation className="w-full">
                            <ConversationContent className="p-4 gap-8">
                                {messages.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 mt-20">
                                        <div className="text-muted-foreground opacity-60 mb-2">
                                            <p className="text-xl font-medium">무엇을 도와드릴까요?</p>
                                        </div>
                                        <Suggestions className="justify-center">
                                            <Suggestion
                                                className="bg-background/80 hover:bg-background shadow-xs border-muted-foreground/20"
                                                suggestion="오늘의 TIL 작성해줘"
                                                onClick={() => setInput("오늘의 TIL 작성해줘")}
                                            />
                                            <Suggestion
                                                className="bg-background/80 hover:bg-background shadow-xs border-muted-foreground/20"
                                                suggestion="React 훅 설명해줘"
                                                onClick={() => setInput("React 훅 설명해줘")}
                                            />
                                            <Suggestion
                                                className="bg-background/80 hover:bg-background shadow-xs border-muted-foreground/20"
                                                suggestion="이력서 검토해줘"
                                                onClick={() => setInput("이력서 검토해줘")}
                                            />
                                        </Suggestions>
                                    </div>
                                )}
                                {messages.map((message) => (
                                    <div key={message.id}>
                                        {/* Handle Sources */}
                                        {message.role === 'assistant' && message.parts?.filter((part) => part.type === 'source-url').length > 0 && (
                                            <Sources className="mb-2">
                                                <SourcesTrigger count={message.parts.filter((part) => part.type === 'source-url').length} />
                                                {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                                                    <SourcesContent key={`${message.id}-source-${i}`}>
                                                        <Source key={`${message.id}-source-${i}`} href={part.url} title={part.title || part.url} />
                                                    </SourcesContent>
                                                ))}
                                            </Sources>
                                        )}

                                        {/* Handle Message Parts */}
                                        {message.parts ? (
                                            message.parts.map((part, i) => {
                                                switch (part.type) {
                                                    case 'text':
                                                        return (
                                                            <div key={`${message.id}-${i}`} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                                                                <Message from={message.role}>
                                                                    <MessageContent className={message.role === 'user'
                                                                        ? "bg-primary text-primary-foreground shadow-md rounded-2xl rounded-tr-none px-4 py-2.5"
                                                                        : "bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl rounded-tl-none px-4 py-2.5"}>
                                                                        <MessageResponse className="text-[15px] leading-relaxed">{part.text}</MessageResponse>
                                                                    </MessageContent>
                                                                </Message>
                                                                {message.role === 'assistant' && i === message.parts.length - 1 && (
                                                                    <MessageActions className="justify-start mt-1">
                                                                        <MessageAction onClick={() => regenerate()} tooltip="Regenerate">
                                                                            <RefreshCcw className="size-4" />
                                                                        </MessageAction>
                                                                        <MessageAction onClick={() => navigator.clipboard.writeText(part.text)} tooltip="Copy">
                                                                            <Copy className="size-4" />
                                                                        </MessageAction>
                                                                    </MessageActions>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'reasoning':
                                                        return (
                                                            <div key={`${message.id}-${i}`} className="mb-2">
                                                                <Reasoning>
                                                                    <ReasoningTrigger />
                                                                    <ReasoningContent>{part.text}</ReasoningContent>
                                                                </Reasoning>
                                                            </div>
                                                        );
                                                    case 'tool-invocation':
                                                    case 'tool-generateImage':
                                                        const toolInvocation = part.toolInvocation || part;
                                                        const { toolCallId, state } = toolInvocation;
                                                        // Fallback for toolName since it might be missing from the object but present in the type prefix
                                                        const effectiveToolName = toolInvocation.toolName || (part.type?.startsWith('tool-') ? part.type.slice(5) : null);
                                                        const isResult = state === 'result' || state === 'output-available';

                                                        if (isResult) {
                                                            const result = toolInvocation.result || toolInvocation.output;
                                                            const imageUrl = result?.url || result?.image || (typeof result === 'string' ? result : null);

                                                            if (effectiveToolName === 'generateImage' && imageUrl) {
                                                                return (
                                                                    <div key={toolCallId} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                                                                        <Message from="assistant">
                                                                            <MessageContent className="bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl rounded-tl-none px-4 py-2.5">
                                                                                <div className="mt-2 space-y-3">
                                                                                    <div className="relative aspect-video w-full max-w-[300px] overflow-hidden rounded-lg border border-border">
                                                                                        <img
                                                                                            src={imageUrl}
                                                                                            alt={result?.prompt || "Generated Image"}
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="w-full max-w-[300px]">
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="w-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                                                                                            onClick={() => setThumbnailUrl(imageUrl)}
                                                                                        >
                                                                                            대표 이미지로 설정
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </MessageContent>
                                                                        </Message>
                                                                    </div>
                                                                );
                                                            }
                                                        } else {
                                                            return (
                                                                <div key={toolCallId} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                                                                    <Message from="assistant">
                                                                        <MessageContent className="bg-background shadow-sm border">
                                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                                이미지 생성 중...
                                                                            </div>
                                                                        </MessageContent>
                                                                    </Message>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    default:
                                                        return null;
                                                }
                                            })
                                        ) : (
                                            // Fallback for legacy messages or non-part based messages
                                            <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                                                <Message from={message.role}>
                                                    <MessageContent className={message.role === 'user' ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm border"}>
                                                        <MessageResponse>{message.content}</MessageResponse>
                                                        {message.toolInvocations?.map(toolInvocation => {
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
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="mt-2 w-full text-xs"
                                                                                onClick={() => setThumbnailUrl(result.url)}
                                                                            >
                                                                                대표 이미지로 설정
                                                                            </Button>
                                                                        </div>
                                                                    );
                                                                }
                                                            }
                                                            return (
                                                                <div key={toolCallId} className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                    이미지 생성 중...
                                                                </div>
                                                            );
                                                        })}
                                                    </MessageContent>
                                                </Message>
                                                {message.role === 'assistant' && (
                                                    <MessageActions className="justify-start mt-1">
                                                        <MessageAction onClick={() => regenerate()} tooltip="Regenerate">
                                                            <RefreshCcw className="size-4" />
                                                        </MessageAction>
                                                        <MessageAction onClick={() => navigator.clipboard.writeText(message.content)} tooltip="Copy">
                                                            <Copy className="size-4" />
                                                        </MessageAction>
                                                    </MessageActions>
                                                )}
                                            </div>
                                        )}

                                        {/* Fallback: Handle Tool Invocations for messages where parts might not cover it or for redundancy */}
                                        {message.toolInvocations?.map(toolInvocation => {
                                            // Avoid double rendering if it's already handled in parts (this serves as a robust fallback)
                                            const isRenderedInParts = message.parts?.some(part =>
                                                (part.type === 'tool-invocation' || part.type === 'tool-generateImage') &&
                                                (part.toolInvocation?.toolCallId === toolInvocation.toolCallId || part.toolCallId === toolInvocation.toolCallId)
                                            );

                                            if (isRenderedInParts) return null;

                                            const { toolName, toolCallId, state } = toolInvocation;
                                            const isResult = state === 'result' || state === 'output-available';

                                            if (isResult) {
                                                const result = toolInvocation.result || toolInvocation.output;
                                                if (toolName === 'generateImage') {
                                                    return (
                                                        <div key={toolCallId} className="mt-2 ml-auto max-w-[85%]">
                                                            <Message from="assistant">
                                                                <MessageContent className="bg-background shadow-sm border">
                                                                    <div className="mt-2">
                                                                        <img
                                                                            src={result.url}
                                                                            alt={result.prompt || "Generated Image"}
                                                                            className="rounded-md w-full max-w-[200px] border border-border"
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="mt-2 w-full text-xs"
                                                                            onClick={() => setThumbnailUrl(result.url)}
                                                                        >
                                                                            대표 이미지로 설정
                                                                        </Button>
                                                                    </div>
                                                                </MessageContent>
                                                            </Message>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return (
                                                <div key={toolCallId} className="mt-2 ml-auto max-w-[85%]">
                                                    <Message from="assistant">
                                                        <MessageContent className="bg-background shadow-sm border">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                이미지 생성 중...
                                                            </div>
                                                        </MessageContent>
                                                    </Message>
                                                </div>
                                            );
                                        })}



                                    </div>
                                ))}
                            </ConversationContent>
                            <ConversationScrollButton />
                        </Conversation>
                    </div>

                    {/* Input Area (Stacked Footer) */}
                    <div className="p-4 bg-background z-20 border-t shrink-0">
                        <div className="max-w-2xl mx-auto w-full">
                            <PromptInput
                                value={input}
                                onChange={handleInputChange}
                                onSubmit={({ text, files }) => {
                                    if (!text.trim() && !files?.length) return;
                                    sendMessage({ role: 'user', content: text }, { body: { conversationId, files } });
                                    setInput('');
                                }}
                                className="shadow-lg border rounded-2xl bg-background overflow-hidden"
                            >
                                <PromptInputHeader>
                                    <PromptInputAttachments>
                                        {(attachment) => <PromptInputAttachment data={attachment} />}
                                    </PromptInputAttachments>
                                </PromptInputHeader>
                                <PromptInputBody>
                                    <PromptInputTextarea
                                        value={input}
                                        onChange={handleInputChange}
                                        placeholder="AI에게 요청하기..."
                                        className="min-h-[52px] border-none focus-visible:ring-0 px-4 py-3"
                                    />
                                </PromptInputBody>
                                <PromptInputFooter className="justify-between p-2 border-t bg-muted/5">
                                    <PromptInputTools>
                                        <PromptInputActionMenu>
                                            <PromptInputActionMenuTrigger />
                                            <PromptInputActionMenuContent>
                                                <PromptInputActionAddAttachments />
                                            </PromptInputActionMenuContent>
                                        </PromptInputActionMenu>
                                    </PromptInputTools>
                                    <PromptInputSubmit
                                        status={isChatLoading ? 'streaming' : undefined}
                                        disabled={isChatLoading}
                                        className="rounded-xl"
                                    >
                                        <Send className="h-4 w-4" />
                                    </PromptInputSubmit>
                                </PromptInputFooter>
                            </PromptInput>
                        </div>
                    </div>
                </div>

                {/* Right Column: Editor (Document Preview Style) */}
                <div className="flex-1 lg:w-1/2 h-full flex flex-col bg-background overflow-hidden min-w-0">
                    <Artifact className="h-full border-none shadow-none rounded-none">
                        <ArtifactHeader className="h-16 shrink-0 bg-background border-b px-4">
                            <ArtifactTitle className="text-sm font-medium text-muted-foreground px-4">일기장</ArtifactTitle>
                            <ArtifactActions>
                                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">취소</Button>
                                <Button size="sm" onClick={handleSave} disabled={loading} className="font-semibold px-6 bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-[1.02]">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {loading ? '저장 중...' : '저장하기'}
                                </Button>
                            </ArtifactActions>
                        </ArtifactHeader>
                        <ArtifactContent className="flex-1 overflow-y-auto p-0">
                            <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-8 min-h-full flex flex-col">
                                {thumbnailUrl && (
                                    <div className="relative group rounded-xl overflow-hidden border bg-muted aspect-video mb-4 shrink-0">
                                        <img
                                            src={thumbnailUrl}
                                            alt="Thumbnail preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setThumbnailUrl('')}
                                            >
                                                대표 이미지 제거
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2 shrink-0">
                                    <label htmlFor="title" className="text-sm font-medium text-muted-foreground sr-only">제목</label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="제목을 입력하세요..."
                                        className="text-4xl lg:text-5xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto rounded-none tracking-tight"
                                    />
                                </div>
                                <div className="flex-1 space-y-2 flex flex-col">
                                    <label htmlFor="content" className="text-sm font-medium text-muted-foreground sr-only">내용</label>

                                    <TiptapEditor
                                        content={content}
                                        onChange={setContent}
                                        placeholder="여기에 내용을 작성하세요..."
                                    />
                                </div>
                            </div>
                        </ArtifactContent>
                    </Artifact>
                </div>
            </div>
        </div >
    );
}
