/**
 * Safe arithmetic expression evaluator.
 * Supports: +, -, *, /, parentheses, decimals, negative numbers.
 * Returns null if expression is invalid.
 * NO eval() usage.
 */

export function evaluateExpression(expr: string): number | null {
  try {
    const tokens = tokenize(expr);
    if (!tokens) return null;
    const result = parseExpression(tokens, { pos: 0 });
    if (result === null || result.pos < tokens.length) return null;
    return result.value;
  } catch {
    return null;
  }
}

/** Check if a string contains arithmetic operators (i.e. is an expression, not just a number) */
export function isExpression(input: string): boolean {
  const trimmed = input.trim();
  // Must contain at least one operator that isn't a leading negative sign
  return /[+\-*/×÷]/.test(trimmed.replace(/^-/, ""));
}

type Token = { type: "number"; value: number } | { type: "op"; value: string } | { type: "paren"; value: string };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const cleaned = expr.replace(/\s/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  const digitOrClose = /[\d.)]/;
  const digitOrOpen = /[\d.(]/;
  const s = cleaned.replace(/x/gi, (match: string, offset: number) => {
    if (offset > 0 && offset < cleaned.length - 1) {
      const prev = cleaned[offset - 1];
      const next = cleaned[offset + 1];
      if (digitOrClose.test(prev) && digitOrOpen.test(next)) return "*";
    }
    return match;
  });

  while (i < s.length) {
    const ch = s[i];
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
    } else if ("+-*/".includes(ch)) {
      // Handle unary minus
      if (ch === "-" && (tokens.length === 0 || tokens[tokens.length - 1].type === "op" || (tokens[tokens.length - 1].type === "paren" && tokens[tokens.length - 1].value === "("))) {
        // Unary minus: read the number
        let num = "-";
        i++;
        while (i < s.length && (/\d/.test(s[i]) || s[i] === ".")) {
          num += s[i];
          i++;
        }
        if (num === "-") return null;
        tokens.push({ type: "number", value: parseFloat(num) });
      } else {
        tokens.push({ type: "op", value: ch });
        i++;
      }
    } else if (/\d/.test(ch) || ch === ".") {
      let num = "";
      while (i < s.length && (/\d/.test(s[i]) || s[i] === ".")) {
        num += s[i];
        i++;
      }
      tokens.push({ type: "number", value: parseFloat(num) });
    } else {
      return null; // invalid character
    }
  }
  return tokens;
}

interface ParseResult {
  value: number;
  pos: number;
}

function parseExpression(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  let left = parseTerm(tokens, ctx);
  if (!left) return null;

  while (ctx.pos < tokens.length && tokens[ctx.pos].type === "op" && (tokens[ctx.pos].value === "+" || tokens[ctx.pos].value === "-")) {
    const op = tokens[ctx.pos].value;
    ctx.pos++;
    const right = parseTerm(tokens, ctx);
    if (!right) return null;
    left = { value: op === "+" ? left.value + right.value : left.value - right.value, pos: ctx.pos };
  }
  return left;
}

function parseTerm(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  let left = parseFactor(tokens, ctx);
  if (!left) return null;

  while (ctx.pos < tokens.length && tokens[ctx.pos].type === "op" && (tokens[ctx.pos].value === "*" || tokens[ctx.pos].value === "/")) {
    const op = tokens[ctx.pos].value;
    ctx.pos++;
    const right = parseFactor(tokens, ctx);
    if (!right) return null;
    if (op === "/" && right.value === 0) return null;
    left = { value: op === "*" ? left.value * right.value : left.value / right.value, pos: ctx.pos };
  }
  return left;
}

function parseFactor(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  if (ctx.pos >= tokens.length) return null;
  const token = tokens[ctx.pos];

  if (token.type === "number") {
    ctx.pos++;
    return { value: token.value, pos: ctx.pos };
  }

  if (token.type === "paren" && token.value === "(") {
    ctx.pos++;
    const result = parseExpression(tokens, ctx);
    if (!result) return null;
    if (ctx.pos >= tokens.length || tokens[ctx.pos].type !== "paren" || tokens[ctx.pos].value !== ")") return null;
    ctx.pos++;
    return { value: result.value, pos: ctx.pos };
  }

  return null;
}
