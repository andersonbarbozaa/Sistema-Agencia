'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Palette,
  ChevronDown,
  RemoveFormatting,
  Sparkles,
} from 'lucide-react';

export interface TextFormatPreset {
  id: string;
  name: string;
  tag: 'p' | 'h2' | 'h3' | 'note';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  textColor?: string;
  highlightColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export const DEFAULT_TEXT_PRESETS: TextFormatPreset[] = [];

export function isDefaultOrRemovedPreset(p: TextFormatPreset): boolean {
  if (!p) return true;
  const id = (p.id || '').toLowerCase();
  const name = (p.name || '').toLowerCase().trim();
  if (
    id === 'preset_note' ||
    id === 'preset_title' ||
    id === 'preset_highlight' ||
    id === 'preset_dialogue' ||
    id === 'preset_alert'
  ) {
    return true;
  }
  if (
    name === 'nota' ||
    name === 'nota de atenção' ||
    name === 'título' ||
    name === 'titulo' ||
    name === 'título de cena' ||
    name === 'titulo de cena' ||
    name === 'grifado' ||
    name === 'marcar' ||
    name === 'marca-texto' ||
    name === 'marca-texto amarelo'
  ) {
    return true;
  }
  return false;
}

export function getPresetShortLabel(rawName: string): string {
  if (!rawName) return '';
  // Remove emojis and symbols
  const cleaned = rawName
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '')
    .trim();

  // Fallback: take first word of the name
  const firstWord = cleaned.split(/[\s\/\-_:]+/)[0];
  return firstWord || rawName;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * Checks whether a range completely encloses an element.
 */
function isRangeCoveringElement(range: Range, element: HTMLElement): boolean {
  try {
    const elRange = document.createRange();
    elRange.selectNodeContents(element);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, elRange) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, elRange) >= 0
    );
  } catch {
    return false;
  }
}

/**
 * Completely unwraps an element, placing its child nodes in its place.
 */
function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/**
 * Unwraps or splits an element when a selected range inside it should be unformatted.
 */
function unformatRangeInsideElement(range: Range, element: HTMLElement) {
  if (isRangeCoveringElement(range, element)) {
    unwrapElement(element);
    return;
  }

  const extracted = range.extractContents();
  const textFragment = document.createDocumentFragment();

  const strip = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textFragment.appendChild(node.cloneNode(true));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        textFragment.appendChild(document.createElement('br'));
      } else {
        el.childNodes.forEach(strip);
      }
    }
  };
  extracted.childNodes.forEach(strip);

  if (!element.hasChildNodes() || element.textContent === '') {
    element.parentNode?.replaceChild(textFragment, element);
    return;
  }

  const marker = document.createElement('span');
  range.insertNode(marker);

  const parent = element.parentNode;
  if (!parent) return;

  const afterElement = element.cloneNode(false) as HTMLElement;
  let passedMarker = false;
  const nodesToMove: Node[] = [];

  element.childNodes.forEach((child) => {
    if (child === marker) {
      passedMarker = true;
      return;
    }
    if (passedMarker) {
      nodesToMove.push(child);
    }
  });

  nodesToMove.forEach((child) => afterElement.appendChild(child));

  parent.insertBefore(textFragment, element.nextSibling);

  if (afterElement.hasChildNodes() && afterElement.textContent !== '') {
    parent.insertBefore(afterElement, textFragment.nextSibling);
  }

  marker.remove();

  if (!element.hasChildNodes() || element.textContent === '') {
    element.remove();
  }
}

/**
 * Removes all formatting from the currently selected range in the editor.
 */
function clearAllFormatting(range: Range, editor: HTMLElement) {
  if (range.collapsed) return;

  try {
    document.execCommand('removeFormat', false, undefined);
  } catch {}

  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

  const ancestorsToUnwrap: HTMLElement[] = [];
  let curr = node as HTMLElement | null;
  while (curr && curr !== editor) {
    if (
      curr.getAttribute?.('data-preset-id') ||
      curr.classList?.contains('rich-note-callout') ||
      ['SPAN', 'H2', 'H3', 'B', 'STRONG', 'I', 'EM', 'U', 'MARK'].includes(curr.tagName) ||
      Boolean(curr.style?.backgroundColor && curr.style.backgroundColor !== 'transparent') ||
      Boolean(curr.style?.color)
    ) {
      ancestorsToUnwrap.push(curr);
    }
    curr = curr.parentElement;
  }

  ancestorsToUnwrap.forEach((ancestor) => {
    unformatRangeInsideElement(range, ancestor);
  });

  const extracted = range.extractContents();
  const cleanFragment = document.createDocumentFragment();
  const extractClean = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      cleanFragment.appendChild(n.cloneNode(true));
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.tagName === 'BR') {
        cleanFragment.appendChild(document.createElement('br'));
      } else {
        el.childNodes.forEach(extractClean);
      }
    }
  };
  extracted.childNodes.forEach(extractClean);
  range.insertNode(cleanFragment);
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escreva as instruções, roteiro, formato ou requisitos...',
  minHeight = '140px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [presets, setPresets] = useState<TextFormatPreset[]>(DEFAULT_TEXT_PRESETS);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  // Sync saved presets from localStorage and /api/settings
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const saved = localStorage.getItem('agency_text_formatting_presets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPresets(parsed.filter((p) => !isDefaultOrRemovedPreset(p)));
          }
        }

        // Fetch latest from API to ensure synchronization with settings
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.text_formatting_presets) {
            const apiPresets = JSON.parse(data.settings.text_formatting_presets);
            if (Array.isArray(apiPresets)) {
              const filtered = apiPresets.filter((p: any) => !isDefaultOrRemovedPreset(p));
              setPresets(filtered);
              localStorage.setItem('agency_text_formatting_presets', JSON.stringify(filtered));
            }
          }
        }
      } catch (e) {
        console.error('Error loading text presets:', e);
      }
    };

    loadPresets();

    const handlePresetsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPresets(e.detail.filter((p: any) => !isDefaultOrRemovedPreset(p)));
      }
    };

    window.addEventListener('agency-presets-updated', handlePresetsUpdated);
    window.addEventListener('storage', loadPresets);
    return () => {
      window.removeEventListener('agency-presets-updated', handlePresetsUpdated);
      window.removeEventListener('storage', loadPresets);
    };
  }, []);

  // Update contentEditable when value prop changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      if (!editorRef.current.contains(document.activeElement)) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, val);
      handleInput();
    }
  };

  // Wrap or format selected range
  const formatSelection = (styles: {
    color?: string;
    bgColor?: string;
    fontSize?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    isNote?: boolean;
    isTitle?: boolean;
    presetName?: string;
    presetId?: string;
  }) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();
    const hasContent = selectedContent.childNodes.length > 0 && selectedContent.textContent?.trim() !== '';

    if (styles.isNote) {
      const noteBox = document.createElement('div');
      noteBox.className = 'rich-note-callout';
      if (styles.presetId) noteBox.setAttribute('data-preset-id', styles.presetId);
      if (styles.presetName) noteBox.setAttribute('data-preset-name', styles.presetName);
      noteBox.style.backgroundColor = styles.bgColor || '#fef3c7';
      noteBox.style.borderLeft = `4px solid ${styles.color || '#f59e0b'}`;
      noteBox.style.color = styles.color || '#92400e';
      noteBox.style.padding = '8px 12px';
      noteBox.style.borderRadius = '8px';
      noteBox.style.margin = '8px 0';
      noteBox.style.fontWeight = styles.bold ? 'bold' : 'normal';
      noteBox.style.fontSize = styles.fontSize === 'sm' ? '12px' : styles.fontSize === 'lg' ? '15px' : styles.fontSize === 'xl' ? '16px' : '13px';
      if (styles.italic) noteBox.style.fontStyle = 'italic';
      noteBox.appendChild(hasContent ? selectedContent : document.createTextNode(styles.presetName || 'Nota: Insira o texto aqui'));
      range.insertNode(noteBox);
    } else if (styles.isTitle) {
      const h2 = document.createElement('h2');
      if (styles.presetId) h2.setAttribute('data-preset-id', styles.presetId);
      if (styles.presetName) h2.setAttribute('data-preset-name', styles.presetName);
      h2.style.fontSize = styles.fontSize === 'xl' ? '20px' : styles.fontSize === 'lg' ? '18px' : '16px';
      h2.style.fontWeight = 'bold';
      h2.style.color = styles.color || '#1e3a8a';
      h2.style.margin = '10px 0 4px 0';
      if (styles.bgColor && styles.bgColor !== 'transparent') {
        h2.style.backgroundColor = styles.bgColor;
        h2.style.padding = '4px 8px';
        h2.style.borderRadius = '6px';
      }
      if (styles.italic) h2.style.fontStyle = 'italic';
      if (styles.underline) h2.style.textDecoration = 'underline';
      h2.appendChild(hasContent ? selectedContent : document.createTextNode(styles.presetName || 'Título'));
      range.insertNode(h2);
    } else {
      const span = document.createElement('span');
      if (styles.presetId) span.setAttribute('data-preset-id', styles.presetId);
      if (styles.presetName) span.setAttribute('data-preset-name', styles.presetName);
      if (styles.color) {
        span.style.color = styles.color;
      } else if (styles.bgColor && styles.bgColor !== 'transparent') {
        span.style.color = '#111827';
      }

      if (styles.bgColor && styles.bgColor !== 'transparent') {
        span.style.backgroundColor = styles.bgColor;
        span.style.padding = '2px 6px';
        span.style.borderRadius = '4px';
        span.style.boxDecorationBreak = 'clone';
        (span.style as any).webkitBoxDecorationBreak = 'clone';
      }

      if (styles.fontSize) {
        if (styles.fontSize === 'sm') span.style.fontSize = '11px';
        if (styles.fontSize === 'base') span.style.fontSize = '13px';
        if (styles.fontSize === 'lg') span.style.fontSize = '15px';
        if (styles.fontSize === 'xl') span.style.fontSize = '17px';
      }

      if (styles.bold) span.style.fontWeight = 'bold';
      if (styles.italic) span.style.fontStyle = 'italic';
      if (styles.underline) span.style.textDecoration = 'underline';

      span.appendChild(hasContent ? selectedContent : document.createTextNode(styles.presetName || 'Texto formatado'));
      range.insertNode(span);
    }

    selection.removeAllRanges();
    handleInput();
  };

  // Toggle or apply preset on current selection
  const applyPreset = (preset: TextFormatPreset) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor) return;

    const shortLabel = getPresetShortLabel(preset.name);

    if (range.collapsed) {
      formatSelection({
        color: preset.textColor,
        bgColor: preset.highlightColor,
        fontSize: preset.fontSize,
        bold: preset.bold,
        italic: preset.italic,
        underline: preset.underline,
        isNote: preset.tag === 'note',
        isTitle: preset.tag === 'h2' || preset.tag === 'h3',
        presetName: shortLabel,
        presetId: preset.id,
      });
      return;
    }

    // Check if the current selection is already formatted with this preset
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let matchedAncestor: HTMLElement | null = null;
    let curr = node as HTMLElement | null;
    while (curr && curr !== editor) {
      const pId = curr.getAttribute?.('data-preset-id');
      const pName = curr.getAttribute?.('data-preset-name');
      const isCallout = curr.classList?.contains('rich-note-callout');
      const isH2 = curr.tagName === 'H2';

      if (
        (pId && pId === preset.id) ||
        (pName && pName.toLowerCase() === preset.name.toLowerCase()) ||
        (preset.tag === 'note' && isCallout) ||
        ((preset.tag === 'h2' || preset.tag === 'h3') && isH2)
      ) {
        matchedAncestor = curr;
        break;
      }
      curr = curr.parentElement;
    }

    if (matchedAncestor) {
      // TOGGLE OFF: remove formatting!
      unformatRangeInsideElement(range, matchedAncestor);
      selection.removeAllRanges();
      handleInput();
      return;
    }

    // Also check inside range contents for matched elements
    const clone = range.cloneContents();
    const internalMatch = clone.querySelector(
      `[data-preset-id="${preset.id}"], [data-preset-name="${preset.name}"]`
    );
    if (internalMatch) {
      clearAllFormatting(range, editor);
      selection.removeAllRanges();
      handleInput();
      return;
    }

    // TOGGLE ON: apply preset formatting
    formatSelection({
      color: preset.textColor,
      bgColor: preset.highlightColor,
      fontSize: preset.fontSize,
      bold: preset.bold,
      italic: preset.italic,
      underline: preset.underline,
      isNote: preset.tag === 'note',
      isTitle: preset.tag === 'h2' || preset.tag === 'h3',
      presetName: shortLabel,
      presetId: preset.id,
    });
  };

  // Limpa formatação do texto selecionado
  const handleClearFormatting = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor || range.collapsed) return;

    clearAllFormatting(range, editor);
    selection.removeAllRanges();
    handleInput();
  };

  const userPresets = presets.filter((p) => !isDefaultOrRemovedPreset(p));

  const colors = [
    { name: 'Padrão', value: '#111827' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Verde', value: '#16a34a' },
    { name: 'Vermelho', value: '#dc2626' },
    { name: 'Amarelo/Ouro', value: '#ca8a04' },
    { name: 'Roxo', value: '#9333ea' },
    { name: 'Laranja', value: '#ea580c' },
  ];

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-1.5 flex flex-wrap items-center gap-1 select-none">
        {/* Bold */}
        <button
          type="button"
          onClick={() => exec('bold')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          title="Negrito (Ctrl+B)"
        >
          <Bold size={14} />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => exec('italic')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          title="Itálico (Ctrl+I)"
        >
          <Italic size={14} />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => exec('underline')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          title="Sublinhado (Ctrl+U)"
        >
          <Underline size={14} />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

        {/* Text Size Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSizePicker(!showSizePicker)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
            title="Tamanho do Texto"
          >
            <span>Tamanho</span>
            <ChevronDown size={11} />
          </button>
          {showSizePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 w-32">
              <button
                type="button"
                onClick={() => { formatSelection({ fontSize: 'sm' }); setShowSizePicker(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Pequeno (12px)
              </button>
              <button
                type="button"
                onClick={() => { formatSelection({ fontSize: 'base' }); setShowSizePicker(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
              >
                Normal (14px)
              </button>
              <button
                type="button"
                onClick={() => { formatSelection({ fontSize: 'lg', bold: true }); setShowSizePicker(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold"
              >
                Médio (16px)
              </button>
              <button
                type="button"
                onClick={() => { formatSelection({ fontSize: 'xl', bold: true }); setShowSizePicker(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm"
              >
                Grande (18px)
              </button>
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowColorPicker(!showColorPicker); }}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-0.5"
            title="Cor da Fonte"
          >
            <Palette size={14} />
            <ChevronDown size={10} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-30 grid grid-cols-4 gap-1.5 w-36">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => { formatSelection({ color: c.value }); setShowColorPicker(false); }}
                  className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

        {/* Limpar Formatação */}
        <button
          type="button"
          onClick={handleClearFormatting}
          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-700 dark:text-gray-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
          title="Limpar formatação do texto selecionado"
        >
          <RemoveFormatting size={14} />
          <span className="text-[11px] font-medium hidden sm:inline">Limpar Formatação</span>
        </button>
      </div>

      {/* Faixa com Todos os Padrões de Roteiro Criados pelo Usuário */}
      {userPresets.length > 0 && (
        <div className="bg-gray-50/90 dark:bg-gray-850 px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs select-none">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0 mr-0.5 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500 hidden sm:inline" /> Padrões:
          </span>
          {userPresets.map((preset) => {
            const shortLabel = getPresetShortLabel(preset.name);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95 shadow-2xs border border-black/5 dark:border-white/10 cursor-pointer"
                style={{
                  color: preset.textColor || (preset.highlightColor ? '#111827' : undefined),
                  backgroundColor: preset.highlightColor || (preset.tag === 'note' ? '#fef3c7' : preset.tag === 'h2' ? '#dbeafe' : '#f3f4f6'),
                  fontWeight: preset.bold ? 'bold' : '500',
                  fontStyle: preset.italic ? 'italic' : 'normal',
                  textDecoration: preset.underline ? 'underline' : 'none',
                }}
                title={`Clique para aplicar ou remover formatação de ${preset.name}`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="p-3 text-xs text-gray-800 dark:text-gray-100 outline-none leading-relaxed overflow-y-auto max-h-[440px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none"
      />
    </div>
  );
}
