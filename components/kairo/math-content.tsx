"use client";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
export function MathContent({ children }: { children: string }) {
  return (
    <div className="math-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              trust: false,
              throwOnError: false,
              maxExpand: 1000,
              maxSize: 20,
              strict: "ignore",
            },
          ],
        ]}
        disallowedElements={["img", "iframe", "script", "style"]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("https://") ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
