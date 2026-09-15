/**
 * Minimal XML well-formedness checker for the emitted SVG.
 *
 * These diagrams are inlined into the page as strings, so a stray unescaped `&`
 * or an unclosed tag is a rendering bug that no type checker can catch. Node has
 * no DOMParser and the project has no XML dependency, so the check lives here:
 * tokenise the tags, keep a stack, and verify the text between them.
 */

const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<>]*")*)\s*(\/?)>/g;
const BAD_ENTITY = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

/** Returns a list of problems; empty means well-formed. */
export function xmlProblems(source: string): string[] {
  const problems: string[] = [];
  const stack: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  TAG.lastIndex = 0;

  const checkText = (text: string) => {
    if (text.includes("<")) problems.push(`stray "<" in text: ${JSON.stringify(text.slice(0, 40))}`);
    if (BAD_ENTITY.test(text)) problems.push(`unescaped "&" in text: ${JSON.stringify(text.slice(0, 40))}`);
  };

  while ((match = TAG.exec(source)) !== null) {
    checkText(source.slice(cursor, match.index));
    cursor = TAG.lastIndex;
    const [, closing, name, , selfClosing] = match;
    if (closing) {
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> closes <${open ?? "nothing"}>`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  checkText(source.slice(cursor));
  if (stack.length) problems.push(`unclosed: ${stack.join(", ")}`);
  return problems;
}

/** Strip <text> and <title> so two drawings can be compared on geometry alone. */
export function graphicsOnly(svg: string): string {
  return svg.replace(/<text[^>]*>[\s\S]*?<\/text>/g, "").replace(/<title>[\s\S]*?<\/title>/g, "");
}

/** Every `#rrggbb`-style literal in the string. */
export function hexLiterals(svg: string): string[] {
  return svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
}
