import React from "react";

/**
 * Minimal markdown renderer for admin-authored article content.
 * Supports headings (#, ##, ###), unordered lists, bold, links and paragraphs.
 * Content is trusted (admin-only authoring); no raw HTML is ever rendered.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on **bold** and [text](url)
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("[")) {
      const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (match) {
        const href = match[2] ?? "#";
        const isExternal = href.startsWith("http");
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-primary underline underline-offset-2"
            rel={isExternal ? "noopener noreferrer" : undefined}
            target={isExternal ? "_blank" : undefined}
          >
            {match[1]}
          </a>,
        );
      } else {
        nodes.push(part);
      }
    } else if (part) {
      nodes.push(part);
    }
  });
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold md:prose-base">
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        const key = `block-${blockIndex}`;
        if (!trimmed) return null;
        if (trimmed.startsWith("### ")) {
          return <h3 key={key}>{renderInline(trimmed.slice(4), key)}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={key}>{renderInline(trimmed.slice(3), key)}</h2>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={key}>{renderInline(trimmed.slice(2), key)}</h2>;
        }
        if (trimmed.split("\n").every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={key}>
              {trimmed.split("\n").map((line, lineIndex) => (
                <li key={`${key}-li-${lineIndex}`}>
                  {renderInline(line.trim().slice(2), `${key}-li-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={key}>{renderInline(trimmed, key)}</p>;
      })}
    </div>
  );
}
