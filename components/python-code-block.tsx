"use client"

import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python"

SyntaxHighlighter.registerLanguage("python", python)

export function PythonCodeBlock({ code }: { code: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Generated code
      </p>

      <div className="overflow-hidden rounded-2xl border border-[#cecacd] bg-[#faf4ed] dark:border-[#524f67] dark:bg-[#191724]">
        <SyntaxHighlighter
          language="python"
          useInlineStyles={false}
          wrapLongLines
          className="!m-0 overflow-x-auto bg-transparent px-4 py-4 text-xs leading-6 text-[#575279] [tab-size:2] dark:text-[#e0def4] [&_code]:bg-transparent [&_code]:font-mono [&_code]:text-[#575279] dark:[&_code]:text-[#e0def4] [&_.comment]:text-[#9893a5] dark:[&_.comment]:text-[#6e6a86] [&_.comment]:italic [&_.function]:text-[#d7827e] dark:[&_.function]:text-[#ebbcba] [&_.keyword]:text-[#286983] dark:[&_.keyword]:text-[#31748f] [&_.number]:text-[#ea9d34] dark:[&_.number]:text-[#f6c177] [&_.operator]:text-[#797593] dark:[&_.operator]:text-[#908caa] [&_.punctuation]:text-[#797593] dark:[&_.punctuation]:text-[#908caa] [&_.string]:text-[#ea9d34] dark:[&_.string]:text-[#f6c177] [&_.token.annotation]:text-[#907aa9] dark:[&_.token.annotation]:text-[#c4a7e7] [&_.token.boolean]:text-[#d7827e] dark:[&_.token.boolean]:text-[#ebbcba] [&_.token.builtin]:text-[#b4637a] dark:[&_.token.builtin]:text-[#eb6f92] [&_.token.class-name]:text-[#56949f] dark:[&_.token.class-name]:text-[#9ccfd8]"
          codeTagProps={{
            className: "font-mono",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
