import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import katex from 'katex';
import { MathNodeView } from './MathNodeView';

export const MathExtension = Node.create({
  name: 'inlineMath',

  inline: true,
  group: 'inline',
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: el => el.getAttribute('data-latex') || '',
        renderHTML: attributes => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'math-node' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});
