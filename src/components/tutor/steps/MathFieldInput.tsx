/**
 * MathFieldInput — textarea with live KaTeX preview.
 *
 * No WYSIWYG library. No Shadow DOM. No re-render conflicts.
 *
 * Students type LaTeX-like expressions (e.g. \frac{1}{2}, 3 \times 10^{3}).
 * The toolbar inserts snippets at the cursor. KaTeX renders a live preview
 * below so students can see the rendered form while they type.
 *
 * Validation receives the raw LaTeX string — the same normalization pipeline
 * as everywhere else handles the rest.
 */
import { memo, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MathText } from '@/lib/mathDisplay';
import { formatMathFieldPreview } from '@/lib/mathNormalize';

// ── Toolbar CMD → LaTeX snippet map ─────────────────────────────────────────
// For 'cmd' type buttons the cursor lands inside the first {} pair.
const CMD_MAP: Record<string, string> = {
  '^':       '^{}',
  '_':       '_{}',
  '\\frac':  '\\frac{}{}',
  '\\sqrt':  '\\sqrt{}',
  '\\int':   '\\int_{}^{}',
  '\\sum':   '\\sum_{}^{}',
  '\\bar':   '\\bar{}',
};

// ── Cursor-aware insertion helper ────────────────────────────────────────────
function insertAtCursor(
  ta: HTMLTextAreaElement,
  text: string,
  placeCursorInBraces: boolean,
): { newValue: string; cursorPos: number } {
  const start = ta.selectionStart ?? ta.value.length;
  const end   = ta.selectionEnd   ?? ta.value.length;
  const newValue = ta.value.slice(0, start) + text + ta.value.slice(end);
  const braceIdx = text.indexOf('{}');
  const cursorPos = placeCursorInBraces && braceIdx !== -1
    ? start + braceIdx + 1          // inside first {}
    : start + text.length;          // after inserted text
  return { newValue, cursorPos };
}

// ── Public handle ────────────────────────────────────────────────────────────
export interface MathFieldInputHandle {
  /** Insert raw LaTeX at cursor (toolbar 'write' buttons). */
  write: (latex: string) => void;
  /** Insert a structural command with cursor landing inside first {}.  */
  cmd:   (command: string) => void;
  focus: () => void;
  clear: () => void;
}

interface MathFieldInputProps {
  value: string;
  onChange: (latex: string) => void;
  onEnter?: () => void;
  readOnly?: boolean;
  className?: string;
}

const MathFieldInputInner = forwardRef<MathFieldInputHandle, MathFieldInputProps>(
  ({ value, onChange, onEnter, readOnly = false, className }, ref) => {
    const taRef = useRef<HTMLTextAreaElement>(null);

    // Shared logic: insert text, update state, restore cursor.
    const doInsert = useCallback(
      (text: string, inBraces: boolean) => {
        const ta = taRef.current;
        if (!ta) return;
        const { newValue, cursorPos } = insertAtCursor(ta, text, inBraces);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.setSelectionRange(cursorPos, cursorPos);
          ta.focus();
        });
      },
      [onChange],
    );

    useImperativeHandle(ref, () => ({
      write: (latex)   => doInsert(latex, false),
      cmd:   (command) => doInsert(CMD_MAP[command] ?? `${command}{}`, true),
      focus: ()        => taRef.current?.focus(),
      clear: ()        => { onChange(''); taRef.current?.focus(); },
    }), [doInsert, onChange]);

    // Auto-resize: shrink to 1 row, then grow to content height.
    const autoResize = (ta: HTMLTextAreaElement) => {
      ta.style.height = 'auto';
      ta.style.height = `${Math.max(38, ta.scrollHeight)}px`;
    };

    return (
      <div className={cn('flex flex-col w-full', className)}>
        {/* Input row */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => {
            autoResize(e.target);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onEnter?.();
            }
          }}
          onInput={(e) => autoResize(e.currentTarget)}
          readOnly={readOnly}
          rows={1}
          placeholder="Enter expression…"
          spellCheck={false}
          className={cn(
            'w-full resize-none font-mono text-sm bg-transparent',
            'outline-none border-none ring-0',
            'px-3 py-2 overflow-hidden leading-normal',
            readOnly && 'opacity-60 cursor-default',
          )}
          style={{ minHeight: '38px', height: '38px' }}
        />

        {/* Live KaTeX preview — only when the value contains actual LaTeX */}
        {/\\[a-zA-Z]|[_^]\{/.test(value) && (
          <div className="px-3 pb-2 pt-0.5 border-t border-slate-100">
            <MathText className="text-sm text-slate-700">{formatMathFieldPreview(value)}</MathText>
          </div>
        )}
      </div>
    );
  },
);

MathFieldInputInner.displayName = 'MathFieldInput';
export const MathFieldInput = memo(MathFieldInputInner);
