import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { oneDark } from '@codemirror/theme-one-dark';
import { acceptCompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { Compartment, Prec, type Extension } from '@codemirror/state';
import { Button } from '@/components/ui/button';
import { Loader2, Minus, Play, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LanguageId } from '../../types';
import { editorFontSizeTheme } from './editorFontSizeTheme';

type Awareness = HocuspocusProvider['awareness'];

interface EditorPanelProps {
  ydoc: Y.Doc;
  awareness: Awareness | null;
  connected: boolean;
  running?: boolean;
  onRun?: (request: { language: LanguageId; code: string }) => void | Promise<void>;
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
] as const;

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 22] as const;
const DEFAULT_FONT_SIZE = 13;
const FONT_SIZE_STORAGE_KEY = 'editorFontSize';

function extensionForLanguage(language: LanguageId): Extension {
  switch (language) {
    case 'typescript':
      return javascript({ typescript: true });
    case 'python':
      return python();
    case 'go':
      return go();
    case 'javascript':
    default:
      return javascript();
  }
}

function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === 'string' && LANGUAGES.some((language) => language.id === value);
}

export default function EditorPanel({
  ydoc,
  awareness,
  connected,
  running = false,
  onRun,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editable = useMemo(() => new Compartment(), []);
  const language = useMemo(() => new Compartment(), []);
  const fontSizeTheme = useMemo(() => new Compartment(), []);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>('javascript');
  const [fontSize, setFontSize] = useState(() => {
    const stored = Number.parseInt(localStorage.getItem(FONT_SIZE_STORAGE_KEY) ?? '', 10);
    return FONT_SIZES.includes(stored as (typeof FONT_SIZES)[number]) ? stored : DEFAULT_FONT_SIZE;
  });
  const initialFontSizeRef = useRef(fontSize);

  useEffect(() => {
    if (!containerRef.current || !awareness) return;

    const yText = ydoc.getText('content');
    const yMeta = ydoc.getMap<LanguageId>('meta');
    const storedLanguage = yMeta.get('language');
    const initialLanguage = isLanguageId(storedLanguage) ? storedLanguage : 'javascript';
    setSelectedLanguage(initialLanguage);

    const view = new EditorView({
      extensions: [
        basicSetup,
        language.of(extensionForLanguage(initialLanguage)),
        oneDark,
        editable.of(EditorView.editable.of(false)),
        fontSizeTheme.of(editorFontSizeTheme(initialFontSizeRef.current)),
        Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }, indentWithTab])),
        yCollab(yText, awareness),
      ],
      parent: containerRef.current,
    });

    viewRef.current = view;

    const onMetaChange = () => {
      const nextLanguage = yMeta.get('language');
      if (!isLanguageId(nextLanguage)) return;

      setSelectedLanguage(nextLanguage);
      view.dispatch({
        effects: language.reconfigure(extensionForLanguage(nextLanguage)),
      });
    };

    yMeta.observe(onMetaChange);
    return () => {
      yMeta.unobserve(onMetaChange);
      view.destroy();
      viewRef.current = null;
    };
  }, [awareness, editable, fontSizeTheme, language, ydoc]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: editable.reconfigure(EditorView.editable.of(connected)),
    });
  }, [connected, editable]);

  function handleLanguageChange(nextLanguage: LanguageId) {
    ydoc.getMap<LanguageId>('meta').set('language', nextLanguage);
  }

  function handleFontSizeChange(nextFontSize: number) {
    setFontSize(nextFontSize);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(nextFontSize));
    viewRef.current?.dispatch({
      effects: fontSizeTheme.reconfigure(editorFontSizeTheme(nextFontSize)),
    });
  }

  function handleRun() {
    const code = ydoc.getText('content').toString();
    void onRun?.({ language: selectedLanguage, code });
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <Select
          value={selectedLanguage}
          onValueChange={(val) => handleLanguageChange(val as LanguageId)}
        >
          <SelectTrigger className="h-7 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.id} value={lang.id} className="text-sm">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          onClick={handleRun}
          disabled={!connected || running || !onRun}
          className="h-7 px-3 text-sm [&_svg]:size-3"
        >
          {running ? (
            <>
              <Loader2 className="animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play />
              Run
            </>
          )}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-7 items-center overflow-hidden rounded-md border border-border bg-background">
            <Button
              type="button"
              variant="ghost"
              aria-label="Decrease font size"
              disabled={fontSize <= FONT_SIZES[0]}
              onClick={() => {
                const index = FONT_SIZES.indexOf(fontSize as (typeof FONT_SIZES)[number]);
                handleFontSizeChange(FONT_SIZES[Math.max(0, index - 1)]);
              }}
              className="h-7 w-7 rounded-none border-none text-muted-foreground hover:text-foreground [&_svg]:size-3"
            >
              <Minus />
            </Button>
            <span className="min-w-[38px] border-x border-border px-1 text-center text-sm text-muted-foreground">
              {fontSize}px
            </span>
            <Button
              type="button"
              variant="ghost"
              aria-label="Increase font size"
              disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
              onClick={() => {
                const index = FONT_SIZES.indexOf(fontSize as (typeof FONT_SIZES)[number]);
                handleFontSizeChange(FONT_SIZES[Math.min(FONT_SIZES.length - 1, index + 1)]);
              }}
              className="h-7 w-7 rounded-none border-none text-muted-foreground hover:text-foreground [&_svg]:size-3"
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden" />
    </section>
  );
}
