'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
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
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactActions, ArtifactContent } from "@/components/ai-elements/artifact";

export default function EditPage() {
    // Editor State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [journalId, setJournalId] = useState(null);

    // Auth & Routing
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();

    // Chat State
    const [conversationId, setConversationId] = useState(null);
    const [initialMessages, setInitialMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

    // Load journal and conversation history on mount
    useEffect(() => {
        const loadJournalAndHistory = async () => {
            if (!params.id) return;

            // Fetch journal
            const { data: journal, error: journalError } = await supabase
                .from('journals')
                .select('*')
                .eq('id', params.id)
                .single();

            if (journalError) {
                console.error('Error fetching journal:', journalError);
                alert('일지를 불러올 수 없습니다.');
                router.push('/');
                return;
            }

            setJournalId(journal.id);
            setTitle(journal.title);
            setContent(journal.content || '');
            setThumbnailUrl(journal.thumbnail_url || '');
            setConversationId(journal.conversation_id);

            // If conversation exists, load messages
            if (journal.conversation_id) {
                const { data: messages, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conv_id', journal.conversation_id)
                    .order('seq', { ascending: true });

                if (messagesError) {
                    console.error('Error fetching messages:', messagesError);
                } else if (messages && messages.length > 0) {
                    // Convert DB messages to AI SDK format
                    const formattedMessages = messages.map((msg, index) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.type === 'image' ? '' : msg.content,
                        // For images, add as tool invocation result for display
                        ...(msg.type === 'image' && {
                            toolInvocations: [{
                                toolName: 'generateImage',
                                toolCallId: `history-${msg.id}`,
                                state: 'result',
                                result: { url: msg.content, prompt: 'Generated image' }
                            }]
                        })
                    }));
                    setInitialMessages(formattedMessages);
                }
            }

            setLoading(false);
            setIsHistoryLoaded(true);
        };

        loadJournalAndHistory();
    }, [params.id, router, supabase]);

    // Initialize chat with conversation ID and initial messages
    const chatHelpers = useChat({
        api: '/api/chat',
        body: { conversationId },
        initialMessages: initialMessages,
        onError: (error) => {
            console.error('Chat Error:', error);
        }
    });

    const { messages, sendMessage, isLoading: isChatLoading, regenerate } = chatHelpers;

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('journals')
            .update({
                title,
                content,
                thumbnail_url: thumbnailUrl,
            })
            .eq('id', params.id);

        if (error) {
            alert('수정 실패: ' + error.message);
        } else {
            router.push('/');
            router.refresh();
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            <div className="flex flex-col lg:flex-row h-full w-full divide-y lg:divide-y-0 lg:divide-x">
                {/* Left Column: AI Chat Agent */}
                <div className="flex-1 lg:w-1/2 h-full flex flex-col bg-sidebar/50 backdrop-blur-sm relative min-w-0">
                    <div className="flex items-center p-4 border-b h-16 bg-background/50 z-20 relative">
                        <h1 className="text-xl font-semibold px-2 tracking-tight">일기 수정하기</h1>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                        <Conversation className="w-full">
                            <ConversationContent className="p-4 gap-8">
                                {messages.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 mt-20">
                                        <div className="text-muted-foreground opacity-60 mb-2">
                                            <p className="text-xl font-medium">이전 대화가 없습니다</p>
                                            <p className="text-sm mt-2">AI와 대화를 시작해보세요</p>
                                        </div>
                                    </div>
                                )}
                                {messages.map((message) => (
                                    <div key={message.id}>
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
                                                    case 'tool-invocation':
                                                    case 'tool-generateImage':
                                                        const toolInvocation = part.toolInvocation || part;
                                                        const { toolCallId, state } = toolInvocation;
                                                        const effectiveToolName = toolInvocation.toolName || (part.type?.startsWith('tool-') ? part.type.slice(5) : null);
                                                        const isResult = state === 'result' || state === 'output-available';

                                                        if (isResult) {
                                                            const result = toolInvocation.result || toolInvocation.output;
                                                            const imageUrl = result?.url || result?.image || (typeof result === 'string' ? result : null);

                                                            if (effectiveToolName === 'generateImage' && imageUrl) {
                                                                return (
                                                                    <div key={toolCallId} className="max-w-[85%]">
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
                                                                <div key={toolCallId} className="max-w-[85%]">
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
                                            // Fallback for legacy messages (from DB)
                                            <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
                                                <Message from={message.role}>
                                                    <MessageContent className={message.role === 'user'
                                                        ? "bg-primary text-primary-foreground shadow-md rounded-2xl rounded-tr-none px-4 py-2.5"
                                                        : "bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl rounded-tl-none px-4 py-2.5"}>
                                                        <MessageResponse className="text-[15px] leading-relaxed">{message.content}</MessageResponse>
                                                        {message.toolInvocations?.map(toolInvocation => {
                                                            const { toolName, toolCallId, state } = toolInvocation;
                                                            if (state === 'result' && toolName === 'generateImage') {
                                                                const result = toolInvocation.result;
                                                                return (
                                                                    <div key={toolCallId} className="mt-2">
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
                                                                );
                                                            }
                                                            return null;
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
                                    </div>
                                ))}
                            </ConversationContent>
                            <ConversationScrollButton />
                        </Conversation>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-background z-20 border-t shrink-0">
                        <div className="max-w-2xl mx-auto w-full">
                            <PromptInput
                                value={input}
                                onChange={handleInputChange}
                                onSubmit={({ text, files }) => {
                                    if (!text.trim() && !files?.length) return;
                                    sendMessage({ role: 'user', content: text }, { body: { files } });
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

                {/* Right Column: Editor */}
                <div className="flex-1 lg:w-1/2 h-full flex flex-col bg-background overflow-hidden min-w-0">
                    <Artifact className="h-full border-none shadow-none rounded-none">
                        <ArtifactHeader className="h-16 shrink-0 bg-background border-b px-4">
                            <ArtifactTitle className="text-sm font-medium text-muted-foreground px-4">일기장 수정</ArtifactTitle>
                            <ArtifactActions>
                                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">취소</Button>
                                <Button size="sm" onClick={handleUpdate} disabled={loading} className="font-semibold px-6 bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-[1.02]">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {loading ? '저장 중...' : '수정 완료'}
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
        </div>
    );
}
