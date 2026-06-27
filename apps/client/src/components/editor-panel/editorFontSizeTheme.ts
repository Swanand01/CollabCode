import { EditorView } from 'codemirror';
import type { Extension } from '@codemirror/state';

export function editorFontSizeTheme(fontSize: number): Extension {
  return EditorView.theme({
    '.cm-scroller': {
      fontSize: `${fontSize}px`,
    },
  });
}
