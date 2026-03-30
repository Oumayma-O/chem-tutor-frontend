/**
 * Pure string → string normalization pipeline for LLM-generated math/LaTeX.
 *
 * No React dependency — safe to import in tests and non-React contexts.
 * Rendering layer: see mathDisplay.tsx
 *
 * Public API
 * ----------
 * normalizeMathString(text, mode)  — single entry point used by all renderers
 * preprocessStatementMath(text)   — compat alias used by ProblemCard
 * fixCorruptedUnitMiddleDots(s)   — used by useGeneratedProblem hook
 *
 * Modes
 * -----
 * "equation" — pure math context (labels, correct_answer, equation_parts).
 *              Skips prose-aware transforms and ASCII-calculator detection.
 * "mixed"    — prose + inline math (instructions, statements). Full pipeline.
 * "hint"     — same normalization as "mixed"; routing to block renderer is
 *              handled by the calling component (HintMarkdown).
 */

export type RenderMode = "equation" | "mixed" | "hint";

// ─── Low-level helpers ────────────────────────────────────────────────────────

const BREVE = "\u02D8"; // appears when U+00B7 (middle dot) is mangled by a sanitizer

export function fixCorruptedUnitMiddleDots(s: string): string {
  if (!s) return s;
  let out = s;
  out = out.replace(new RegExp(`mol\\s*0\\s*${BREVE}\\s*0b7\\s*K`, "gi"), "mol\\cdot K");
  out = out.replace(new RegExp(`\\(mol\\s*0\\s*${BREVE}\\s*0b7\\s*K\\)`, "gi"), "(mol\\cdot K)");
  out = out.replace(new RegExp(`mol\\s*${BREVE}\\s*0b7\\s*K`, "gi"), "mol\\cdot K");
  out = out.replace(/mol\s*0b7\s*K/gi, "mol\\cdot K");
  out = out.replace(/mol\s*0{1,2}b7\s*K/gi, "mol\\cdot K");
  out = out.replace(/mol\u00b7K/g, "mol\\cdot K");
  out = out.replace(/mol\s*\u00b7\s*K/g, "mol\\cdot K");
  return out;
}

export function fixCdotKelvinForKatex(text: string): string {
  if (!text) return text;
  return text.replace(/\\cdot\s*K\b/g, "\\cdot \\text{K}");
}

export function autoWrapLatex(text: string): string {
  // eslint-disable-next-line no-param-reassign
  text = text.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  if (/\$|\\\(/.test(text)) return text;
  if (!/\\[a-zA-Z]/.test(text) && !/[_^]\{/.test(text)) return text;
  return `$${text}$`;
}

function removeStrayUnescapedDollars(inner: string): string {
  return inner.replace(/(?<!\\)\$/g, "");
}

function stripOuterMathDelimiters(s: string): string {
  let t = s.trim();
  for (let n = 0; n < 8; n++) {
    if (t.startsWith("$$") && t.endsWith("$$") && t.length >= 4) { t = t.slice(2, -2).trim(); continue; }
    if (t.startsWith("$") && t.endsWith("$") && t.length >= 2 && !t.startsWith("$$")) { t = t.slice(1, -1).trim(); continue; }
    break;
  }
  return t;
}

function trimTripleDollarNoise(s: string): string {
  return s.replace(/^\s*\$\$\$/g, "$$").replace(/\$\$\$\s*$/g, "$$");
}

export function preferDisplayMathBody(text: string): string {
  let inner = stripOuterMathDelimiters(text.trim());
  inner = removeStrayUnescapedDollars(inner);
  return `$$${inner}$$`;
}

// ─── cdot / unit fixes ────────────────────────────────────────────────────────

function fixMangledCdotInUnits(s: string): string {
  let out = fixCorruptedUnitMiddleDots(s);
  out = out.replace(/\\textbackslash\s*\\text\{cdot\s*([A-Za-z]+)\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\text\{cdot([A-Za-z]+)\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\text\{\s*cdot\s*([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\cdot/gi, "\\cdot");
  out = out.replace(/\\backslash\s*\{\s*cdot\s*([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\text\{\s*cdot([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\text\{\s*cdot\s+([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\text\{\s*cdot\s*\}/gi, "\\cdot");
  const CDOTS_PH = "__PRESERVE_CDOTS__";
  out = out.replace(/\\cdots/g, CDOTS_PH);
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  out = out.split(CDOTS_PH).join("\\cdots");
  return out;
}

function fixMangledCdotInsideAllInlineMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner) => `$${fixMangledCdotInUnits(inner)}$`);
}

// ─── Brace / atom parsing ─────────────────────────────────────────────────────

function skipBalancedBraces(s: string, i: number): number {
  if (i >= s.length || s[i] !== "{") return i;
  let depth = 0;
  let k = i;
  while (k < s.length) {
    if (s[k] === "{") depth++;
    if (s[k] === "}") { depth--; if (depth === 0) return k + 1; }
    k++;
  }
  return s.length;
}

function skipOptionalSquareBrackets(s: string, i: number): number {
  if (i >= s.length || s[i] !== "[") return i;
  let depth = 1;
  let k = i + 1;
  while (k < s.length && depth > 0) {
    if (s[k] === "[") depth++;
    if (s[k] === "]") depth--;
    k++;
  }
  return k;
}

function consumeOneLatexAtom(s: string, i: number): number {
  if (i >= s.length) return i;
  if (s[i] === "^" || s[i] === "_") {
    const k = i + 1;
    if (k < s.length && s[k] === "{") return skipBalancedBraces(s, k);
    if (k < s.length) return k + 1;
    return i + 1;
  }
  if (s[i] !== "\\") return i;
  let j = i + 1;
  if (j >= s.length) return i;
  if (/[a-zA-Z]/.test(s[j])) { while (j < s.length && /[a-zA-Z]/.test(s[j])) j++; } else { j++; }
  let k = j;
  if (k < s.length && s[k] === "*") k++;
  while (k < s.length && s[k] === "[") k = skipOptionalSquareBrackets(s, k);
  while (k < s.length && s[k] === "{") k = skipBalancedBraces(s, k);
  return k;
}

function consumeLatexRun(s: string, start: number): number {
  let i = start;
  while (i < s.length) {
    const next = consumeOneLatexAtom(s, i);
    if (next === i) break;
    i = next;
  }
  return i;
}

// ─── Prose / math interleaving ────────────────────────────────────────────────

const PROSE_WORD_AFTER_MATH =
  /^(and|or|for|are|is|the|of|in|to|use|each|before|after|what|which|with|from|that|this|these|those|when|where|how|why|will|has|have|had|was|were|not|can|may|must|should|could|would|using|given|find|calculate|compute|determine|express|show|write|solve|note|assume|consider|suppose|let|both|either|nearest|per|via|contains|sample|abundances|naturally|occurring|mass|decimal|calculating|percentage|answer|formula|convert|average|atomic|isotopes|copper|abundant|following|above|below|between|among|within|during|while|until|since|because|therefore|thus|such|same|other|another|different|similar|equal|greater|less|than|more|most|least|all|some|none|any|every|only|also|even|still|again|first|second|third|last|next|previous|approximately|about|around|roughly|exactly|nearly|almost|always|never|sometimes|often|usually|typically|normally|commonly|frequently|rarely|perhaps|possibly|probably|likely|unlikely|certainly|definitely|surely|indeed|actually|really|very|quite|rather|fairly|pretty|too|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|percent|percentage|problem|question|example|solution|reaction|equation|constant|temperature|pressure|volume|molecule|atoms|molar|acid|base|gas|liquid|solid|aqueous|equilibrium|stoichiometry|yield|limiting|excess|reactant|product|initial|final|change|ratio|proportion|mean|median|range|graph|data|table|figure|value|values|units|unit|state|standard|conditions)\b/i;

export function interleaveMathInSegment(s: string): string {
  if (!s.trim()) return s;
  if (!/\\|[_^]/.test(s)) return s;

  let out = "";
  let mathBuf = "";
  const flushMath = () => { if (mathBuf) { out += `$${mathBuf}$`; mathBuf = ""; } };

  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      let j = i;
      while (j < s.length && /\s/.test(s[j])) j++;
      const ws = s.slice(i, j);
      const after = s.slice(j);
      const proseMatch = after.match(PROSE_WORD_AFTER_MATH);
      if (proseMatch) { flushMath(); out += ws; out += proseMatch[0]; i = j + proseMatch[0].length; continue; }
      mathBuf += ws; i = j; continue;
    }
    if (s[i] === "\\" || s[i] === "^" || s[i] === "_") {
      const end = consumeLatexRun(s, i);
      if (end === i) { flushMath(); out += s[i]; i++; continue; }
      mathBuf += s.slice(i, end); i = end; continue;
    }
    let j = i;
    while (j < s.length && !/\s/.test(s[j]) && s[j] !== "\\" && s[j] !== "^" && s[j] !== "_") j++;
    const plain = s.slice(i, j);
    if (mathBuf && /^[+\-*/=]$/.test(plain)) { mathBuf += plain; i = j; continue; }
    if (/^\d+\.?\d*$/.test(plain) && j < s.length && s[j] === "\\") {
      const afterCmd = consumeOneLatexAtom(s, j);
      const cmd = s.slice(j, afterCmd);
      if (cmd === "\\%") { mathBuf += plain + cmd; i = afterCmd; continue; }
    }
    flushMath(); out += plain; i = j;
  }
  flushMath();
  return out;
}

function fixGloballyWrappedStatement(text: string): string {
  const t = text.trim();
  if (!t.startsWith("$") || !t.endsWith("$") || t.startsWith("$$")) return text;
  let inner = t.slice(1, -1);
  inner = removeStrayUnescapedDollars(inner);

  if (!inner.includes("\n\n")) {
    if (!/\\[a-zA-Z]|[_^]\{/.test(inner)) return text;
    return interleaveMathInSegment(inner);
  }

  return inner
    .split("\n\n")
    .map((para) => {
      type Seg = { type: "prose" | "math"; content: string };
      const segs: Seg[] = [];
      let lastIdx = 0;
      const re = /\\text\{([^{}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(para)) !== null) {
        if (m.index > lastIdx) segs.push({ type: "math", content: para.slice(lastIdx, m.index) });
        segs.push({ type: "prose", content: m[1] });
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < para.length) segs.push({ type: "math", content: para.slice(lastIdx) });
      return segs
        .map((seg) => {
          if (seg.type === "prose") return seg.content;
          const s = seg.content;
          if (!s.trim()) return s;
          if (!/\\[a-zA-Z]|[_^]\{/.test(s)) return s;
          return interleaveMathInSegment(s);
        })
        .join("");
    })
    .join("\n\n");
}

/** Call on a full multi-paragraph statement BEFORE splitting on \n\n. */
export const preprocessStatementMath = fixGloballyWrappedStatement;

// ─── Escape / encoding fixes ──────────────────────────────────────────────────

function recoverBareLatexTextCommands(text: string): string {
  return text
    .replace(/(^|[^\\])text\{/g, "$1\\text{")
    .replace(/(^|[^\\])mathrm\{/g, "$1\\mathrm{");
}

function escapeHashInsideInlineMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner: string) => `$${inner.replace(/(?<!\\)#/g, "\\#")}$`);
}

function normalizeMzNotationArtifacts(text: string): string {
  let out = text;
  out = out.replace(/\\u002[fF]/g, "/");
  out = out.replace(/\\x2[fF]/g, "/");
  out = out.replace(/\\\//g, "/");
  out = out.replace(/m\s*[uU]002[fF]\s*z/g, "m/z");
  out = out.replace(/m\s*[ðÐ]0?2[fF]\s*z/g, "m/z");
  return out;
}

/**
 * Apply a transform only to the non-math segments of a string (text outside $...$).
 * Math blocks ($...$) are passed through unchanged to avoid double-processing.
 */
export function applyOutsideMath(text: string, fn: (segment: string) => string): string {
  const parts = text.split(/(\$[^$]+\$)/);
  return parts.map((part, i) => (i % 2 === 1 ? part : fn(part))).join("");
}

const _CDOTS_SHIELD = "__CDOTS_SHIELD__";

export function normalizeLatexEscapes(text: string): string {
  let out = recoverBareLatexTextCommands(normalizeMzNotationArtifacts(fixCorruptedUnitMiddleDots(text)));
  // Shield \cdots BEFORE running \cdot([A-Za-z]) — otherwise \cdots → \cdot s
  out = out.replace(/\\cdots/g, _CDOTS_SHIELD);
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  out = out.replace(new RegExp(_CDOTS_SHIELD, "g"), "\\cdots");
  out = trimTripleDollarNoise(out);

  // Collapse $$...$$ → $...$ (strip stray $ inside each block)
  let collapsed = "";
  while (collapsed !== out) {
    collapsed = out;
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner: string) => {
      const cleaned = removeStrayUnescapedDollars(inner.trim());
      return `$${cleaned}$`;
    });
  }
  out = out.replace(/\$\$/g, "$");

  // Fix double-escaped backslashes (\\text → \text)
  out = out.replace(/\\\\/g, "\\");
  out = out.replace(/\\cdots/g, _CDOTS_SHIELD);
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  out = out.replace(new RegExp(_CDOTS_SHIELD, "g"), "\\cdots");

  out = fixMangledCdotInUnits(out);
  out = fixMangledCdotInsideAllInlineMath(out);
  out = escapeHashInsideInlineMath(out);

  // Fix $X$^{n} / $X$_{n}: sub/superscript leaked outside closing $
  out = out.replace(/\$([^$]+)\$\^\{([^}]+)\}/g, (_, inner, exp) => `$${inner}^{${exp}}$`);
  out = out.replace(/\$([^$]+)\$_\{([^}]+)\}/g, (_, inner, sub) => `$${inner}_{${sub}}$`);

  // Restore JSON-eaten LaTeX commands
  out = out.replace(/\u0009ext(?=[\s{(]|$)/g, "\\text");
  out = out.replace(/\u0009imes(?=[\s{,.)\]$]|$)/g, "\\times");
  out = out.replace(/\u0009heta(?=[\s{_^,.)\]$]|$)/g, "\\theta");
  out = out.replace(/\u0009au(?=[\s{_^,.)\]$]|$)/g, "\\tau");
  out = out.replace(/\u0009o(?=[\s{]|$)/g, "\\to");
  out = out.replace(/\u000crac(?=\{)/g, "\\frac");
  out = out.replace(/\u000corall(?=[\s{]|$)/g, "\\forall");
  out = out.replace(/\u000dightarrow/g, "\\rightarrow");
  out = out.replace(/\u000dho(?=[\s{_^,.)\]$]|$)/g, "\\rho");
  out = out.replace(/\u0008eta(?=[\s{_^,.)\]$]|$)/g, "\\beta");

  out = fixMangledCdotInUnits(out);
  out = fixMangledCdotInsideAllInlineMath(out);
  out = escapeHashInsideInlineMath(out);

  // Wrap bare \cdot X outside $...$ into $\cdot X$
  out = applyOutsideMath(out, (seg) => {
    const ph = "__CDOTS_PH__";
    return seg
      .replace(/\\cdots/g, ph)
      .replace(/\\cdot([A-Za-z])/g, (_, ch) => `$\\cdot ${ch}$`)
      .replace(new RegExp(ph, "g"), "\\cdots");
  });

  // Normalize bare superscript/subscript LaTeX commands to braced form so KaTeX
  // parses them reliably: E^\circ → E^{\circ}, X_\alpha → X_{\alpha}
  // Must run inside existing $...$ blocks (applyOutsideMath would skip them).
  out = out.replace(/\$([^$]+)\$/g, (_, inner: string) =>
    `$${inner
      .replace(/\^(\\[a-zA-Z]+)/g, (__, cmd) => `^{${cmd}}`)
      .replace(/_(\\[a-zA-Z]+)/g, (__, cmd) => `_{${cmd}}`)
    }$`,
  );

  return out;
}

const CARET_AS_BACKSLASH_COMMANDS =
  "mathrm|text|mathit|mathbf|times|cdot|ldots|rightarrow|left|right|frac|sqrt|sin|cos|log|ln";

export function normalizeAsciiCalculatorEquation(text: string): string {
  const joiner = text.includes("\n") ? "\n" : null;
  const lines = joiner != null ? text.split("\n") : [text];
  const outLines = lines.map((raw) => {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) return line;
    if (/\$/.test(t)) return line;
    if (/\\[a-zA-Z]/.test(t)) return line;
    if (!/=/.test(t)) return line;
    const sci = /\d\.?\d*e[+-]?\d/i.test(t);
    const star = /\*/.test(t);
    const ln = /\bln\s*\(/i.test(t);
    if (!sci && !star && !ln) return line;
    let o = t
      .replace(/\bEa\b/g, "E_a")
      .replace(/(\d+\.?\d*)e([+-]?\d+)/gi, (_, b: string, e: string) => `${b}\\times 10^{${e}}`)
      .replace(/\*\s*/g, "\\cdot ")
      .replace(/\bln\s*\(/gi, "\\ln(");
    return `$${o}$`;
  });
  return joiner != null ? outLines.join("\n") : outLines[0] ?? text;
}

function scientificNotationToMath(text: string): string {
  let out = text;
  out = out.replace(new RegExp(`\\^(${CARET_AS_BACKSLASH_COMMANDS})(?=[{\\s]|$)`, "g"), "\\$1");
  out = out.replace(/(\d+\.?\d*)e(\d+)/gi, (_, base, exp) => `${base} × $10^{${exp}}$`);
  out = out.replace(/10\^(\d+)/g, (_, exp) => `$10^{${exp}}$`);
  // Wrap letter^{exp} / letter_{sub} (letter immediately before the ^ or _)
  out = applyOutsideMath(out, (seg) =>
    seg
      .replace(/([A-Za-z\]\)])\^\{([^}$]+)\}/g, (_, base, exp) => `$${base}^{${exp}}$`)
      .replace(/([A-Za-z\]\)])_\{([^}$]+)\}/g, (_, base, sub) => `$${base}_{${sub}}$`),
  );
  // Wrap bare ^{n} / _{n} NOT immediately after a letter — covers isotope / mass-number
  // notation such as " ^{28}Si" or "^{29}Si".  Without this, the raw ^{ survives to
  // autoWrapLatex which wraps the entire paragraph in $…$, causing KaTeX to strip every
  // inter-word space (all words run together in the rendered output).
  out = applyOutsideMath(out, (seg) =>
    seg
      .replace(/(?<![A-Za-z\]\)])\^\{([^}$]+)\}/g, (_, exp) => `$^{${exp}}$`)
      .replace(/(?<![A-Za-z\]\)])_\{([^}$]+)\}/g,  (_, sub) => `$_{${sub}}$`),
  );
  out = applyOutsideMath(out, (seg) =>
    seg.replace(/\^(-?[a-zA-Z0-9]+)/g, (_, exp) => `$^{${exp}}$`),
  );
  return out;
}

// ─── Public entry point ────────────────────────────────────────────────────────

/**
 * Normalize LLM-generated math/LaTeX text before rendering.
 * This is the single contract between backend output and frontend renderers.
 */
export function normalizeMathString(text: string, mode: RenderMode = "mixed"): string {
  if (!text) return text;
  const cdotFixed = fixCdotKelvinForKatex(text);
  if (mode === "equation") {
    // Pure math: skip prose-aware and ASCII-calc transforms
    return normalizeLatexEscapes(scientificNotationToMath(cdotFixed));
  }
  // "mixed" | "hint" — full pipeline
  const ascii = normalizeAsciiCalculatorEquation(cdotFixed);
  const escaped = normalizeLatexEscapes(ascii);
  const fixedWrapping = fixGloballyWrappedStatement(escaped);
  return scientificNotationToMath(fixedWrapping);
}
