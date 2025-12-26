'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
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
import { Send, Loader2, RefreshCcw, Copy, Trash2, FileEdit, Github } from 'lucide-react';
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
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
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [originalTitle, setOriginalTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    // GitHub Integration State
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');
    const [fetchingCommits, setFetchingCommits] = useState(false);

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

            // Generate conversationId if missing
            const convId = journal.conversation_id || crypto.randomUUID();
            setConversationId(convId);

            setOriginalTitle(journal.title);
            setOriginalContent(journal.content || '');

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
                    const formattedMessages = messages.map((msg) => {
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
                    setInitialMessages(formattedMessages);
                }
            }

            setLoading(false);
            setIsHistoryLoaded(true);
        };

        loadJournalAndHistory();
    }, [params.id, router, supabase]);

    // Initialize chat - we'll use setMessages after data loads since
    // useChat's initialMessages only works on first render
    const chatHelpers = useChat({
        api: '/api/chat',
        body: { conversationId },
        // Use experimental_prepareRequestBody to include current editor content
        experimental_prepareRequestBody: ({ messages, id }) => ({
            messages,
            conversationId,
            editorContent: content,
            editorTitle: title,
        }),
        initialMessages: [],
        onError: (error) => {
            console.error('Chat Error:', error);
        }
    });

    const { messages: chatMessages, sendMessage, isLoading: isChatLoading, regenerate, setMessages } = chatHelpers;

    // Set messages when history is loaded
    useEffect(() => {
        if (isHistoryLoaded && initialMessages.length > 0 && chatMessages.length === 0) {
            setMessages(initialMessages);
        }
    }, [isHistoryLoaded, initialMessages, chatMessages.length, setMessages]);

    // Use chatMessages instead of messages to avoid variable shadowing
    const messages = chatMessages;

    // Check GitHub connection status on mount
    useEffect(() => {
        const checkGithubStatus = async () => {
            try {
                const response = await fetch('/api/github/status');
                const data = await response.json();
                setGithubConnected(data.connected);
                if (data.username) setGithubUsername(data.username);
            } catch (err) {
                console.error('Error checking GitHub status:', err);
            }
        };
        checkGithubStatus();
    }, []);

    // Handle GitHub commits fetch
    const handleFetchGithubCommits = async () => {
        if (!githubConnected) {
            window.location.href = '/api/github/auth';
            return;
        }

        setFetchingCommits(true);
        try {
            const response = await fetch('/api/github/commits');
            const data = await response.json();

            if (data.error) {
                alert('커밋을 가져오는데 실패했습니다: ' + data.error);
                return;
            }

            if (data.commits.length === 0) {
                alert('오늘 커밋 내역이 없습니다.');
                return;
            }

            const commitsSummary = data.commits.map(c =>
                `- [${c.repo.split('/')[1] || c.repo}] ${c.message}`
            ).join('\n');

            const prompt = `오늘 (${data.date}) 내가 한 GitHub 커밋들을 바탕으로 개발 일지를 작성해줘:\n\n${commitsSummary}\n\n총 ${data.totalCommits}개의 커밋, ${data.repositories.length}개의 레포지토리`;

            setInput(prompt);
        } catch (err) {
            alert('오류가 발생했습니다.');
        } finally {
            setFetchingCommits(false);
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    // Convert content to lines (splitting by HTML tags)
    const contentToLines = (content) => {
        if (!content) return [];
        return content
            .replace(/></g, '>\n<')
            .split('\n')
            .filter(line => line.trim());
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

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('journals')
            .update({
                title,
                content,
                thumbnail_url: thumbnailUrl,
                conversation_id: conversationId,
                is_draft: false, // Mark as published when saving
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

    // Check if there are unsaved changes
    const hasUnsavedChanges = () => {
        return (title !== originalTitle || content !== originalContent) && !isSaved;
    };

    // Handle cancel button - show dialog if unsaved changes
    const handleCancel = () => {
        if (!hasUnsavedChanges()) {
            router.back();
            return;
        }
        setShowLeaveDialog(true);
    };

    // Leave without saving
    const handleLeaveWithoutSaving = () => {
        setShowLeaveDialog(false);
        router.push('/');
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
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
                                                        case 'tool-editContent':
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
                                                                if (state === 'result' && toolName === 'editContent') {
                                                                    const result = toolInvocation.result;
                                                                    if (!result?.content) return null;

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
                                        <PromptInputTools className="gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleFetchGithubCommits}
                                                disabled={fetchingCommits}
                                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                                title={githubConnected ? `GitHub 연결됨 (${githubUsername})` : 'GitHub 연결하기'}
                                            >
                                                {fetchingCommits ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Github className={`h-4 w-4 ${githubConnected ? 'text-green-500' : ''}`} />
                                                )}
                                                <span className="ml-1.5 text-xs hidden sm:inline">
                                                    {fetchingCommits ? '가져오는 중...' : githubConnected ? '개발일지' : 'GitHub'}
                                                </span>
                                            </Button>
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
                                <ArtifactTitle className="text-sm font-medium text-muted-foreground px-4">일기 수정</ArtifactTitle>
                                <ArtifactActions>
                                    <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground hover:text-foreground">취소</Button>
                                    <Button size="sm" onClick={handleUpdate} disabled={loading} className="font-semibold px-6 bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-[1.02]">
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {loading ? '수정 중...' : '수정 완료'}
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

            {/* Leave Confirmation Dialog */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>저장되지 않은 변경사항이 있습니다</AlertDialogTitle>
                        <AlertDialogDescription>
                            수정 내용을 저장하지 않고 나가시겠습니까?
                            저장하지 않은 변경사항은 사라집니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>계속 수정하기</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveWithoutSaving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            저장하지 않고 나가기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
