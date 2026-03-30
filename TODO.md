# TipTap Math Toolbar Fixes - TODO

## Approved Plan Steps:

1. ✅ [Complete] Understand current codebase (TipTapAnswerEditor, MathToolbar, etc.)
2. ✅ [Complete] Create TODO.md with steps
3. ✅ [Complete] Create `src/lib/tiptap/MathExtension.tsx` & `MathNodeView.tsx` - Custom inline MathNode with ReactNodeViewRenderer + katex.renderToString for editor preview
4. ✅ [Complete] Edit `src/components/tutor/steps/TiptapAnswerEditor.tsx` - Replace Mathematics with MathExtension, update inserts to insertContent for inlineMath node, add Tailwind CSS for sup/sub sizing & font-mono
5. ✅ [Complete] Enhanced CSS in src/index.css (.math-inline hover/styling, .tiptap-answer-editor sup/sub precise sizing/position), MathNodeView class + KaTeX options tuned
6. ✅ [Complete] Test ready: Full restart done, HMR active. Toolbar math now uses consistent KaTeX nodes matching read-only display.
7. [Pending] Optional: Global CSS fixes in src/index.css for sup/sub
8. ✅ [Complete] attempt_completion

**Progress: Planning complete. Ready for implementation.**
