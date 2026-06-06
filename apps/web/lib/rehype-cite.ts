// rehype plugin: wrap inline source citations in <span class="cite"> so they
// render faded/muted instead of competing with the answer prose.
//
// Targets three citation shapes the model emits:
//   (Slack, 2026-05-30)  (Jira)  (slack · 2026-05-30)   -> parenthetical, starts with a source
//   [KAN-4]  [slack · 2026-05-30]                        -> bracketed ref
//   KAN-4  PROJ-123                                       -> bare ticket key
// It deliberately does NOT match metadata parens like
//   (In Progress, Yash Bharadwaj, due 2026-05-30)        -> kept as normal text
// because those don't start with a source word.

type HNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};

const SRC = "(?:[Ss]lack|[Jj]ira|[Gg]mail|[Ee]mail|[Dd]rive)";
const CITE_RE = new RegExp(
  [
    `\\(${SRC}\\b[^)]*\\)`, // (Slack, 2026-05-30), (slack · …), (Jira)
    `\\[(?:[A-Z]{2,}-\\d+|${SRC}\\b)[^\\]]*\\]`, // [KAN-4], [slack · …]
    `\\b[A-Z]{2,}-\\d+\\b`, // bare KAN-4 / PROJ-123
  ].join("|"),
  "g",
);

function transform(node: HNode): void {
  if (!node.children) return;
  const out: HNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      const text = child.value;
      CITE_RE.lastIndex = 0;
      let last = 0;
      let m: RegExpExecArray | null;
      let matched = false;
      while ((m = CITE_RE.exec(text))) {
        matched = true;
        if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
        out.push({
          type: "element",
          tagName: "span",
          properties: { className: ["cite"] },
          children: [{ type: "text", value: m[0] }],
        });
        last = m.index + m[0].length;
      }
      if (!matched) {
        out.push(child);
      } else if (last < text.length) {
        out.push({ type: "text", value: text.slice(last) });
      }
    } else {
      if (child.type === "element") transform(child);
      out.push(child);
    }
  }
  node.children = out;
}

export default function rehypeCite() {
  return (tree: HNode) => transform(tree);
}
