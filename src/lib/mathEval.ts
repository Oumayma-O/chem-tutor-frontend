/**
 * Safe arithmetic expression evaluator.
 * Supports: +, -, *, /, ^, parentheses, decimals, negative numbers.
 * Scientific functions: ln(), log(), exp(), sqrt(), sin(), cos(), tan(), abs(), pi, e.
 * Returns null if expression is invalid.
 * NO eval() usage.
 */

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS: Record<string, (x: number) => number> = {
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
};

export function evaluateExpression(expr: string): number | null {
  try {
    const tokens = tokenize(expr);
    if (!tokens) return null;
    const result = parseExpression(tokens, { pos: 0 });
    if (result === null || result.pos < tokens.length) return null;
    if (!isFinite(result.value)) return null;
    return result.value;
  } catch {
    return null;
  }
}

export function isExpression(input: string): boolean {
  const trimmed = input.trim();
  return /[+\-*/×÷^]/.test(trimmed.replace(/^-/, "")) || /[a-z]+\(/i.test(trimmed);
}

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: string }
  | { type: "paren"; value: string }
  | { type: "func"; value: string };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const cleaned = expr
    .replace(/\s/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");

  const s = cleaned;

  while (i < s.length) {
    const ch = s[i];

    // Function names or constants (alphabetic)
    if (/[a-zA-Z]/.test(ch)) {
      let name = "";
      while (i < s.length && /[a-zA-Z]/.test(s[i])) {
        name += s[i];
        i++;
      }
      const lower = name.toLowerCase();
      if (lower in FUNCTIONS) {
        tokens.push({ type: "func", value: lower });
      } else if (lower in CONSTANTS) {
        tokens.push({ type: "number", value: CONSTANTS[lower] });
      } else {
        return null;
      }
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
    } else if ("+-*/^".includes(ch)) {
      if (
        ch === "-" &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "op" ||
          (tokens[tokens.length - 1].type === "paren" &&
            tokens[tokens.length - 1].value === "("))
      ) {
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
      return null;
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

  while (
    ctx.pos < tokens.length &&
    tokens[ctx.pos].type === "op" &&
    (tokens[ctx.pos].value === "+" || tokens[ctx.pos].value === "-")
  ) {
    const op = tokens[ctx.pos].value;
    ctx.pos++;
    const right = parseTerm(tokens, ctx);
    if (!right) return null;
    left = {
      value: op === "+" ? left.value + right.value : left.value - right.value,
      pos: ctx.pos,
    };
  }
  return left;
}

function parseTerm(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  let left = parsePower(tokens, ctx);
  if (!left) return null;

  while (
    ctx.pos < tokens.length &&
    tokens[ctx.pos].type === "op" &&
    (tokens[ctx.pos].value === "*" || tokens[ctx.pos].value === "/")
  ) {
    const op = tokens[ctx.pos].value;
    ctx.pos++;
    const right = parsePower(tokens, ctx);
    if (!right) return null;
    if (op === "/" && right.value === 0) return null;
    left = {
      value: op === "*" ? left.value * right.value : left.value / right.value,
      pos: ctx.pos,
    };
  }
  return left;
}

function parsePower(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  const base = parseFactor(tokens, ctx);
  if (!base) return null;

  if (
    ctx.pos < tokens.length &&
    tokens[ctx.pos].type === "op" &&
    tokens[ctx.pos].value === "^"
  ) {
    ctx.pos++;
    const exp = parsePower(tokens, ctx);
    if (!exp) return null;
    return { value: Math.pow(base.value, exp.value), pos: ctx.pos };
  }
  return base;
}

function parseFactor(tokens: Token[], ctx: { pos: number }): ParseResult | null {
  if (ctx.pos >= tokens.length) return null;
  const token = tokens[ctx.pos];

  // Function call: func(expr)
  if (token.type === "func") {
    const fnName = token.value;
    ctx.pos++;
    if (
      ctx.pos >= tokens.length ||
      tokens[ctx.pos].type !== "paren" ||
      tokens[ctx.pos].value !== "("
    )
      return null;
    ctx.pos++;
    const inner = parseExpression(tokens, ctx);
    if (!inner) return null;
    if (
      ctx.pos >= tokens.length ||
      tokens[ctx.pos].type !== "paren" ||
      tokens[ctx.pos].value !== ")"
    )
      return null;
    ctx.pos++;
    const fn = FUNCTIONS[fnName];
    if (!fn) return null;
    return { value: fn(inner.value), pos: ctx.pos };
  }

  if (token.type === "number") {
    ctx.pos++;
    return { value: token.value, pos: ctx.pos };
  }

  if (token.type === "paren" && token.value === "(") {
    ctx.pos++;
    const result = parseExpression(tokens, ctx);
    if (!result) return null;
    if (
      ctx.pos >= tokens.length ||
      tokens[ctx.pos].type !== "paren" ||
      tokens[ctx.pos].value !== ")"
    )
      return null;
    ctx.pos++;
    return { value: result.value, pos: ctx.pos };
  }

  return null;
}
