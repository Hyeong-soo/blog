"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MathExtension } from "@aarkue/tiptap-math-extension";
import "katex/dist/katex.min.css";
import { useEffect } from "react";

export default function TiptapViewer({ content }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            MathExtension.configure({
                evaluation: false,
            }),
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none",
            },
        },
        content: content,
        editable: false,
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && content) { // Ensure content is parsed even if it changes
            // Comparing getHTML() might be expensive or cause loops if formatting differs slightly
            // But for a viewer standard usage, setContent is fine.
            // Ideally we just set it once on mount or when id changes.
            // But here content is the string.
            // Let's safe guard.
            if (editor.getHTML() !== content) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    return <EditorContent editor={editor} />;
}
