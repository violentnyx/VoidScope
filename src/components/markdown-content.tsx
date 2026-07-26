import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return part;
  });
}

export function MarkdownContent({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    nodes.push(<ul key={`list-${nodes.length}`}>{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
    list = [];
  };
  const flushCode = () => {
    nodes.push(<pre key={`code-${nodes.length}`}><code>{code.join("\n")}</code></pre>);
    code = [];
  };

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCode) flushCode(); else flushList();
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (/^[-*] /.test(line)) { list.push(line.slice(2)); return; }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) nodes.push(<h3 key={nodes.length}>{inline(line.slice(4))}</h3>);
    else if (line.startsWith("## ")) nodes.push(<h2 key={nodes.length}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# ")) nodes.push(<h1 key={nodes.length}>{inline(line.slice(2))}</h1>);
    else if (line.startsWith("> ")) nodes.push(<blockquote key={nodes.length}>{inline(line.slice(2))}</blockquote>);
    else nodes.push(<p key={nodes.length}>{inline(line)}</p>);
  });
  flushList();
  if (inCode && code.length) flushCode();

  return <article className="markdown-content">{nodes}</article>;
}
