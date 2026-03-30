import type { JSONContent } from "@tiptap/core";

/**
 * Round-trip format for tutor answers: normal prose + inline math as $latex$.
 * Paragraphs separated by blank lines (\n\n). Single newlines become hard breaks.
 */

function parseInlineSegment(segment: string): JSONContent[] {
  const parts: JSONContent[] = [];
  const re = /\$((?:[^$\\]|\\.)*)\$/g;
  let last = 0;
  let m: RegExpExecArray | null = re.exec(segment);
  while (m !== null) {
    if (m.index > last) {
      parts.push({ type: "text", text: segment.slice(last, m.index) });
    }
    parts.push({ type: "inlineMath", attrs: { latex: m[1].replace(/\\\$/g, "$") } });
    last = m.index + m[0].length;
    m = re.exec(segment);
  }
  if (last < segment.length) {
    parts.push({ type: "text", text: segment.slice(last) });
  }
  return parts;
}

/** Build paragraph content: supports single \n as hardBreak */
function parseParagraphBlock(block: string): JSONContent[] {
  const lines = block.split("\n");
  const out: JSONContent[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push({ type: "hardBreak" });
    out.push(...parseInlineSegment(line));
  });
  return out;
}

export function answerStringToDoc(s: string): JSONContent {
  const t = s ?? "";
  if (!t.trim()) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  const blocks = t.split(/\n\n+/);
  const content: JSONContent[] = blocks.map((block) => ({
    type: "paragraph",
    content: parseParagraphBlock(block),
  }));
  return { type: "doc", content };
}

function serializeInlineContent(nodes: JSONContent[] | undefined): string {
  if (!nodes?.length) return "";
  return nodes
    .map((n) => {
      if (n.type === "text") return n.text ?? "";
      if (n.type === "inlineMath") {
        const latex = (n.attrs?.latex as string) ?? "";
        return `$${latex.replace(/\$/g, "\\$")}$`;
      }
      if (n.type === "hardBreak") return "\n";
      return "";
    })
    .join("");
}

/** Flatten doc to storable string for API / useStepHandlers. */
export function docToAnswerString(doc: JSONContent | null): string {
  if (!doc || doc.type !== "doc" || !doc.content?.length) return "";
  const paragraphs = doc.content
    .filter((c) => c.type === "paragraph")
    .map((p) => serializeInlineContent(p.content));
  return paragraphs.join("\n\n");
}
