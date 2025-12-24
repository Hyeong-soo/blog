"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { MathExtension } from "@aarkue/tiptap-math-extension";
import "katex/dist/katex.min.css";
import { Toolbar } from "./toolbar";
import { useEffect } from "react";

export default function TiptapEditor({ content, onChange, placeholder = "내용을 입력하세요..." }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder,
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg border border-border max-w-full h-auto my-4',
                },
            }),
            MathExtension.configure({
                evaluation: false,
            }),
        ],
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[500px]",
            },
        },
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false, // Ensure compatibility with Next.js SSR
    });

    // Update editor content if external content changes (e.g., initial load or reset)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="flex flex-col w-full relative">
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b mb-4">
                <Toolbar editor={editor} />
            </div>
            <div className="flex-1">
                <EditorContent editor={editor} className="min-h-[500px]" />
            </div>
        </div>
    );
}
