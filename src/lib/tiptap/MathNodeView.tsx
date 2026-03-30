import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const MathNodeView = (props: NodeViewProps) => {
  const { latex } = props.node.attrs as { latex: string };
const html = katex.renderToString(latex, {
    output: 'html',
    displayMode: false,
    throwOnError: false,
    strict: false,
  });

  const handleClick = () => {
    const newLatex = prompt('Edit LaTeX:', latex);
    if (newLatex !== null && newLatex !== latex) {
      props.updateAttributes({ latex: newLatex });
    }
  };

  return (
    <NodeViewWrapper
className="math-inline inline-flex align-baseline select-none cursor-pointer [font-size:inherit] inline-katex"
      onClick={handleClick}
      contentEditable={false}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
};
