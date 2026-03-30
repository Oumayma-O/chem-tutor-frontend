/**
 * Prose-first answer editor: TipTap + KaTeX inline math (not a single math field).
 */
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MathExtension } from "@/lib/tiptap/MathExtension";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { answerStringToDoc, docToAnswerString } from "@/lib/tiptapAnswerSerialize";

export interface MathFieldInputHandle {
  write: (latex: string) => void;
  cmd: (command: string) => void;
  focus: () => void;
  clear: () => void;
}

interface TiptapAnswerEditorProps {
  value: string;
  onChange: (s: string) => void;
  onEnter?: () => void;
  readOnly?: boolean;
  className?: string;
}

/** Map MathToolbar inserts to inline-math LaTeX snippets */
function toolbarInsert(editor: Editor, type: "cmd" | "write", value: string) {
  editor.chain().focus();
  if (type === "cmd") {
    switch (value) {
      case "^":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '^{}' } }).run();
        return;
      case "_":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '_{}' } }).run();
        return;
      case "\\frac":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '\\frac{}{}' } }).run();
        return;
      case "\\sqrt":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '\\sqrt{}' } }).run();
        return;
      case "\\int":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '\\int ' } }).run();
        return;
      case "\\sum":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '\\sum ' } }).run();
        return;
      case "\\bar":
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '\\bar{}' } }).run();
        return;
      default:
        editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: value } }).run();
        return;
    }
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("\\") || /[{}^_]/.test(trimmed)) {
    editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: trimmed } }).run();
  } else {
    editor.chain().insertContent(trimmed).run();
  }
}

const Inner = forwardRef<MathFieldInputHandle, TiptapAnswerEditorProps>(
  ({ value, onChange, onEnter, readOnly = false, className }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const lastEmitted = useRef(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onEnterRef = useRef(onEnter);
    onEnterRef.current = onEnter;

    const extensions = useMemo(
      () => [
        StarterKit.configure({
          heading: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
        }),
        Placeholder.configure({
          placeholder:
            "Write normally — Enter for a new line. Type $$…$$ for a math bubble, or use the Σ toolbar.",
          emptyEditorClass: "is-editor-empty",
        }),
        MathExtension,
      ],
      [],
    );

    const editor = useEditor({
      extensions,
      content: answerStringToDoc(value),
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: cn(
            "tiptap-answer-editor prose prose-sm max-w-none min-h-[40px] px-3 py-2 outline-none",
            "focus:outline-none [&_.tiptap-answer-editor_sup]:font-size-[0.65em] [&_.tiptap-answer-editor_sup]:line-height-0 [&_.tiptap-answer-editor_sup]:vertical-align-super [&_.tiptap-answer-editor_sub]:font-size-[0.65em] [&_.tiptap-answer-editor_sub]:line-height-0 [&_.tiptap-answer-editor_sub]:vertical-align-sub [&_.tiptap-answer-editor]:font-mono leading-tight",
          ),
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && onEnterRef.current) {
            event.preventDefault();
            onEnterRef.current();
            return true;
          }
          return false;
        },
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      onUpdate: ({ editor: ed }) => {
        const s = docToAnswerString(ed.getJSON());
        lastEmitted.current = s;
        onChangeRef.current(s);
      },
    });

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!readOnly);
    }, [editor, readOnly]);

    useEffect(() => {
      if (!editor) return;
      if (value === lastEmitted.current) return;
      const next = docToAnswerString(editor.getJSON());
      if (value === next) return;
      editor.commands.setContent(answerStringToDoc(value), { emitUpdate: false });
      lastEmitted.current = value;
    }, [editor, value]);

    useImperativeHandle(ref, () => ({
      write: (latex: string) => {
        if (!editor) return;
        toolbarInsert(editor, "write", latex);
        const s = docToAnswerString(editor.getJSON());
        lastEmitted.current = s;
        onChangeRef.current(s);
      },
      cmd: (command: string) => {
        if (!editor) return;
        toolbarInsert(editor, "cmd", command);
        const s = docToAnswerString(editor.getJSON());
        lastEmitted.current = s;
        onChangeRef.current(s);
      },
      focus: () => editor?.chain().focus().run(),
      clear: () => {
        if (!editor) return;
        editor.commands.clearContent();
        lastEmitted.current = "";
        onChangeRef.current("");
      },
    }));

    if (!editor) {
      return (
        <div className={cn("min-h-[40px] rounded-md border border-border bg-muted/30 animate-pulse", className)} />
      );
    }

    return (
      <div className={cn("tiptap-answer-root", className)} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    );
  },
);

Inner.displayName = "TiptapAnswerEditor";

export const TiptapAnswerEditor = memo(Inner);

