'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react'
import { diffWords } from 'diff';
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
import { Send, Loader2, RefreshCcw, Copy, Trash2, FileEdit } from 'lucide-react';
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactActions, ArtifactContent } from "@/components/ai-elements/artifact";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WritePage() {
    // Editor State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [draftId, setDraftId] = useState(null);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Auth & Routing
    const router = useRouter();
    const supabase = createClient();

    // Chat State (Vercel AI SDK)
    const [conversationId, setConversationId] = useState(null);
    const [input, setInput] = useState('');
    const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);

    // Initialize conversation ID
    useEffect(() => {
        const savedState = localStorage.getItem('diary-draft');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.conversationId) {
                    setConversationId(parsed.conversationId);
                    return;
                }
            } catch (e) {
                console.error('Error parsing saved state for ID', e);
            }
        }
        // If no saved ID, generate new one
        setConversationId(crypto.randomUUID());
    }, []);

    const chatHelpers = useChat({
        api: '/api/chat',
        body: {
            conversationId,
        },
        // Use experimental_prepareRequestBody to include current editor content
        experimental_prepareRequestBody: ({ messages, id }) => ({
            messages,
            conversationId,
            editorContent: content,
            editorTitle: title,
        }),
        initialMessages: [],
        onResponse: (response) => {
            console.log('Chat Response Status:', response.status);
            console.log('Chat Response Headers:', Object.fromEntries(response.headers.entries()));
        },
        onFinish: (message) => {
            console.log('Chat Finished:', message);
        },
        onError: (error) => {
            console.error('Chat Error:', error);
        }
    });

    const { messages, sendMessage, isLoading: isChatLoading, setMessages, regenerate } = chatHelpers;

    // Load persisted state and history
    useEffect(() => {
        if (!conversationId) return; // Wait for ID initialization
        if (initialMessagesLoaded) return; // Only load once

        const loadStateAndHistory = async () => {
            const savedState = localStorage.getItem('diary-draft');
            if (savedState) {
                try {
                    const { title: savedTitle, content: savedContent, conversationId: savedConvId, thumbnailUrl: savedThumbnail } = JSON.parse(savedState);

                    if (savedConvId === conversationId) {
                        // Only restore if IDs match (which they should based on init logic)
                        if (savedTitle) setTitle(savedTitle);
                        if (savedContent) setContent(savedContent);
                        if (savedThumbnail) setThumbnailUrl(savedThumbnail);

                        // Fetch conversation history
                        const { data: dbMessages, error } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('conv_id', conversationId)
                            .order('seq', { ascending: true });

                        if (error) {
                            console.error('Error fetching history:', error);
                        } else if (dbMessages && dbMessages.length > 0) {
                            const formattedMessages = dbMessages.map((msg) => {
                                // For images, add as tool invocation part
                                if (msg.type === 'image') {
                                    return {
                                        id: msg.id,
                                        role: msg.role,
                                        content: '',
                                        parts: [{
                                            type: 'tool-invocation',
                                            toolInvocation: {
                                                toolName: 'generateImage',
                                                toolCallId: `history-${msg.id}`,
                                                state: 'result',
                                                result: { url: msg.content, prompt: 'Generated image' }
                                            }
                                        }]
                                    };
                                }

                                // For editContent, add as tool invocation part
                                if (msg.type === 'editContent') {
                                    try {
                                        const editResult = JSON.parse(msg.content);
                                        return {
                                            id: msg.id,
                                            role: msg.role,
                                            content: '',
                                            parts: [{
                                                type: 'tool-invocation',
                                                toolInvocation: {
                                                    toolName: 'editContent',
                                                    toolCallId: `history-${msg.id}`,
                                                    state: 'result',
                                                    result: editResult
                                                }
                                            }]
                                        };
                                    } catch (e) {
                                        console.error('Error parsing editContent:', e);
                                        return {
                                            id: msg.id,
                                            role: msg.role,
                                            content: 'Error loading edit history',
                                            parts: [{ type: 'text', text: 'Error loading edit history' }]
                                        };
                                    }
                                }

                                // Default text message
                                return {
                                    id: msg.id,
                                    role: msg.role,
                                    content: msg.content,
                                    parts: [{ type: 'text', text: msg.content }]
                                };
                            });
                            setMessages(formattedMessages);
                        }
                    }
                } catch (e) {
                    console.error('Error restoring state:', e);
                }
            }
            setInitialMessagesLoaded(true);
        };

        loadStateAndHistory();
    }, [conversationId]);

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



    // Save to localStorage on change
    useEffect(() => {
        if ((title || content || thumbnailUrl) && conversationId) {
            const state = {
                title,
                content,
                thumbnailUrl,
                conversationId,
                timestamp: Date.now()
            };
            localStorage.setItem('diary-draft', JSON.stringify(state));
        }
    }, [title, content, thumbnailUrl, conversationId]);

    // Convert content to lines (splitting by HTML tags)
    const contentToLines = (content) => {
        if (!content) return [];
        return content
            .replace(/></g, '>\n<')
            .split('\n')
            .filter(line => line.trim());
    };

    // Convert lines back to content
    const linesToContent = (lines) => {
        return lines.join('');
    };

    // Render line-based diff (git style)
    const renderDiff = (oldContent, newContent) => {
        const oldLines = contentToLines(oldContent || '');
        const newLines = contentToLines(newContent || '');

        const diffLines = [];
        let i = 0, j = 0;
        while (i < oldLines.length || j < newLines.length) {
            const oldLine = oldLines[i];
            const newLine = newLines[j];

            if (oldLine === newLine) {
                diffLines.push({ type: 'context', content: oldLine });
                i++; j++;
            } else if (oldLine && !newLines.includes(oldLine)) {
                diffLines.push({ type: 'remove', content: oldLine });
                i++;
            } else if (newLine && !oldLines.includes(newLine)) {
                diffLines.push({ type: 'add', content: newLine });
                j++;
            } else {
                if (oldLine) {
                    diffLines.push({ type: 'remove', content: oldLine });
                    i++;
                }
                if (newLine) {
                    diffLines.push({ type: 'add', content: newLine });
                    j++;
                }
            }
        }

        const stripHtml = (html) => html?.replace(/<[^>]*>/g, '').trim() || '';

        return (
            <div className="font-mono text-xs space-y-0.5">
                {diffLines.map((line, index) => {
                    if (line.type === 'remove') {
                        return (
                            <div key={index} className="flex bg-red-100 dark:bg-red-900/30 rounded px-2 py-0.5">
                                <span className="text-red-600 dark:text-red-400 font-bold mr-2 select-none">−</span>
                                <span className="text-red-700 dark:text-red-300 line-through">{stripHtml(line.content)}</span>
                            </div>
                        );
                    }
                    if (line.type === 'add') {
                        return (
                            <div key={index} className="flex bg-green-100 dark:bg-green-900/30 rounded px-2 py-0.5">
                                <span className="text-green-600 dark:text-green-400 font-bold mr-2 select-none">+</span>
                                <span className="text-green-700 dark:text-green-300">{stripHtml(line.content)}</span>
                            </div>
                        );
                    }
                    return null;
                })}
                {diffLines.filter(l => l.type !== 'context').length === 0 && (
                    <div className="text-muted-foreground italic">변경 사항 없음</div>
                )}
            </div>
        );
    };

    // Add beforeunload handler
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (content.trim() && !isSaved) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [content, isSaved]);

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) {
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // If not logged in, redirect to login
                // But first save to local storage as backup
                localStorage.setItem('unsaved_draft', JSON.stringify({ title, content }));
                router.push('/login');
                return;
            }

            const postData = {
                title: title || '제목 없음',
                content,
                thumbnail_url: thumbnailUrl,
                user_id: user.id,
                is_draft: true, // Save as draft
                conversation_id: conversationId // Link message history
            };

            // Save conversation FIRST (before journals, due to foreign key constraint)
            const { error: convError } = await supabase
                .from('conversations')
                .upsert({
                    id: conversationId,
                    user_id: user.id,
                    title: title || messages[0]?.content?.substring(0, 50) || 'New Conversation',
                });

            if (convError) {
                console.error('Error saving conversation:', convError);
                throw convError; // Stop if conversation save fails
            }

            if (draftId) {
                // Update existing draft
                const { error } = await supabase
                    .from('journals')
                    .update(postData)
                    .eq('id', draftId);

                if (error) throw error;
            } else {
                // Create new draft
                const { data, error } = await supabase
                    .from('journals')
                    .insert(postData)
                    .select()
                    .single();

                if (error) throw error;
                setDraftId(data.id);
            }

            setIsSaved(true);

            // Clear local storage on success
            localStorage.removeItem('diary-draft');

            // Redirect to home after successful save
            router.push('/');

        } catch (error) {
            console.error('Error saving draft:', error.message || error);
            if (error.details) console.error('Error details:', error.details);
            alert(`저장에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (content.trim() && !isSaved) {
            setShowLeaveDialog(true);
        } else {
            router.back();
        }
    };

    const handleSaveDraftAndLeave = async () => {
        await handleSave();
        setShowLeaveDialog(false);
        router.back();
    };

    const handleDiscard = () => {
        // Close leave dialog first
        setShowLeaveDialog(false);
        // Then show confirmation dialog
        setShowDiscardDialog(true);
    };

    const confirmDiscard = async () => {
        try {
            // Delete conversation history if it exists
            if (conversationId) {
                await fetch('/api/draft/discard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId }),
                });
            }

            // Clean up state
            localStorage.removeItem('diary-draft');
            setShowDiscardDialog(false);
            router.back();
        } catch (error) {
            console.error('Error discarding draft:', error);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden relative font-sans">
            {/* Left Column: AI Chat Agent */}
            <div className="flex-1 lg:w-1/2 h-full flex flex-col bg-sidebar/50 backdrop-blur-sm relative min-w-0">
                <div className="flex items-center p-4 border-b h-16 bg-background/50 z-20 relative">
                    <h1 className="text-xl font-semibold px-2 tracking-tight">일기 쓰기</h1>
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
                            {messages.map((message, idx) => (
                                <div key={`${message.id}-${idx}`}>
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
                                                case 'tool-editContent':
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

                                                        // Handle editContent tool
                                                        if (effectiveToolName === 'editContent' && result?.content) {
                                                            const previewContent = result.content;

                                                            return (
                                                                <div key={toolCallId} className="max-w-[85%]">
                                                                    <Message from="assistant">
                                                                        <MessageContent className="bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl rounded-tl-none p-4">
                                                                            <div className="flex flex-col gap-3">
                                                                                <div className="flex items-center gap-2">
                                                                                    <FileEdit className="h-4 w-4 text-primary" />
                                                                                    <span className="font-medium text-sm">에디터 수정 제안</span>
                                                                                </div>
                                                                                <p className="text-sm text-muted-foreground">{result.summary}</p>

                                                                                {/* New Title if provided */}
                                                                                {result.newTitle && (
                                                                                    <div className="text-xs pb-2 border-b">
                                                                                        <span className="text-muted-foreground">새 제목: </span>
                                                                                        <span className="font-medium">{result.newTitle}</span>
                                                                                    </div>
                                                                                )}

                                                                                {/* Visual Diff Preview */}
                                                                                <div className="border rounded-lg p-3 bg-muted/10 max-h-64 overflow-y-auto">
                                                                                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                                                                                        <span className="inline-block w-3 h-3 bg-red-200 dark:bg-red-900/50 rounded"></span>
                                                                                        <span>삭제</span>
                                                                                        <span className="inline-block w-3 h-3 bg-green-200 dark:bg-green-900/50 rounded ml-2"></span>
                                                                                        <span>추가</span>
                                                                                    </div>
                                                                                    {renderDiff(content, previewContent)}
                                                                                </div>

                                                                                <div className="flex gap-2">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            setContent(previewContent);
                                                                                            if (result.newTitle) setTitle(result.newTitle);
                                                                                        }}
                                                                                        className="flex-1"
                                                                                    >
                                                                                        에디터에 적용
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </MessageContent>
                                                                    </Message>
                                                                </div>
                                                            );
                                                        }
                                                    } else {
                                                        // Loading state for tools
                                                        if (effectiveToolName === 'editContent') {
                                                            return (
                                                                <div key={toolCallId} className="max-w-[85%]">
                                                                    <Message from="assistant">
                                                                        <MessageContent className="bg-background shadow-sm border">
                                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                                내용 작성 중...
                                                                            </div>
                                                                        </MessageContent>
                                                                    </Message>
                                                                </div>
                                                            );
                                                        }
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
                                                            if (toolName === 'editContent' && result?.content) {
                                                                const previewContent = result.content;
                                                                return (
                                                                    <div key={toolCallId} className="mt-3 border rounded-lg p-3 bg-muted/20">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <FileEdit className="h-4 w-4 text-primary" />
                                                                            <span className="font-medium text-sm">에디터 수정 제안</span>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground mb-2">{result.summary}</p>
                                                                        <div className="border rounded p-2 bg-muted/10 max-h-32 overflow-y-auto mb-2">
                                                                            {renderDiff(content, previewContent)}
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setContent(previewContent);
                                                                                if (result.newTitle) setTitle(result.newTitle);
                                                                            }}
                                                                            className="w-full"
                                                                        >
                                                                            에디터에 적용
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            }
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
                            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground hover:text-foreground">취소</Button>
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

            {/* Leave Confirmation Dialog */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>저장되지 않은 내용이 있습니다</AlertDialogTitle>
                        <AlertDialogDescription>
                            작성 중인 일기를 임시저장하시겠습니까?
                            저장하지 않으면 내용이 사라집니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>
                            계속 작성하기
                        </AlertDialogCancel>
                        <Button variant="destructive" onClick={handleDiscard}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제하고 나가기
                        </Button>
                        <AlertDialogAction onClick={handleSaveDraftAndLeave}>
                            임시저장
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Discard Confirmation Dialog */}
            <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            작성 중인 일기와 AI 대화 내역이 모두 삭제됩니다.
                            이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDiscard}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            삭제하기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
