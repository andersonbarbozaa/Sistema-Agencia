'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Palette,
  Heading,
  FileText,
  AlertCircle,
  Sparkles,
  ChevronDown,
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

export const DEFAULT_TEXT_PRESETS: TextFormatPreset[] = [
  {
    id: 'preset_note',
    name: '📌 Nota de Atenção',
    tag: 'note',
    textColor: '#92400e',
    highlightColor: '#fef3c7',
    bold: true,
  },
  {
    id: 'preset_title',
    name: '🎬 Título de Cena',
    tag: 'h2',
    textColor: '#1e40af',
    fontSize: 'lg',
    bold: true,
  },
  {
    id: 'preset_highlight',
    name: '🖍️ Marca-texto Amarelo',
    tag: 'p',
    highlightColor: '#fef08a',
    bold: false,
  },
  {
    id: 'preset_dialogue',
    name: '💬 Fala / Diálogo',
    tag: 'p',
    textColor: '#4338ca',
    italic: true,
  },
  {
    id: 'preset_alert',
    name: '⚠️ Alerta Crítico',
    tag: 'note',
    textColor: '#991b1b',
    highlightColor: '#fee2e2',
    bold: true,
  },
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
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
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  // Sync saved presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agency_text_formatting_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading text presets:', e);
    }
  }, []);

  // Update contentEditable when value prop changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      // Only set if completely different to avoid moving the cursor while typing
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
  }) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();

    if (styles.isNote) {
      // Create callout / note block
      const noteBox = document.createElement('div');
      noteBox.className = 'rich-note-callout';
      noteBox.style.backgroundColor = styles.bgColor || '#fef3c7';
      noteBox.style.borderLeft = `4px solid ${styles.color || '#f59e0b'}`;
      noteBox.style.color = styles.color || '#92400e';
      noteBox.style.padding = '8px 12px';
      noteBox.style.borderRadius = '6px';
      noteBox.style.margin = '8px 0';
      noteBox.style.fontWeight = styles.bold ? 'bold' : 'normal';
      noteBox.appendChild(selectedContent.childNodes.length > 0 ? selectedContent : document.createTextNode('Nota: Insira o texto aqui'));
      range.insertNode(noteBox);
    } else if (styles.isTitle) {
      // Create heading block
      const h2 = document.createElement('h2');
      h2.style.fontSize = '18px';
      h2.style.fontWeight = 'bold';
      h2.style.color = styles.color || '#1e3a8a';
      h2.style.margin = '8px 0 4px 0';
      if (styles.bgColor) h2.style.backgroundColor = styles.bgColor;
      h2.appendChild(selectedContent.childNodes.length > 0 ? selectedContent : document.createTextNode('Título'));
      range.insertNode(h2);
    } else {
      // Span inline formatting
      const span = document.createElement('span');
      if (styles.color) span.style.color = styles.color;
      if (styles.bgColor) {
        span.style.backgroundColor = styles.bgColor;
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
      }
      if (styles.fontSize) {
        if (styles.fontSize === 'sm') span.style.fontSize = '12px';
        if (styles.fontSize === 'base') span.style.fontSize = '14px';
        if (styles.fontSize === 'lg') span.style.fontSize = '16px';
        if (styles.fontSize === 'xl') span.style.fontSize = '18px';
      }
      if (styles.bold) span.style.fontWeight = 'bold';
      if (styles.italic) span.style.fontStyle = 'italic';
      if (styles.underline) span.style.textDecoration = 'underline';

      span.appendChild(selectedContent.childNodes.length > 0 ? selectedContent : document.createTextNode('Texto formatado'));
      range.insertNode(span);
    }

    selection.removeAllRanges();
    handleInput();
  };

  const applyPreset = (preset: TextFormatPreset) => {
    formatSelection({
      color: preset.textColor,
      bgColor: preset.highlightColor,
      fontSize: preset.fontSize,
      bold: preset.bold,
      italic: preset.italic,
      underline: preset.underline,
      isNote: preset.tag === 'note',
      isTitle: preset.tag === 'h2' || preset.tag === 'h3',
    });
    setShowPresetsMenu(false);
  };

  const colors = [
    { name: 'Padrão', value: '#111827' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Verde', value: '#16a34a' },
    { name: 'Vermelho', value: '#dc2626' },
    { name: 'Amarelo/Ouro', value: '#ca8a04' },
    { name: 'Roxo', value: '#9333ea' },
    { name: 'Laranja', value: '#ea580c' },
  ];

  const highlights = [
    { name: 'Nenhum', value: 'transparent' },
    { name: 'Amarelo', value: '#fef08a' },
    { name: 'Verde', value: '#bbf7d0' },
    { name: 'Rosa', value: '#fbcfe8' },
    { name: 'Azul', value: '#bae6fd' },
    { name: 'Laranja', value: '#fed7aa' },
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
            onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
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
                  className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlighter (Marca-texto) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-amber-600 dark:text-amber-400 flex items-center gap-0.5"
            title="Grifado (Marca-texto)"
          >
            <Highlighter size={14} />
            <ChevronDown size={10} />
          </button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-30 grid grid-cols-3 gap-1.5 w-32">
              {highlights.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  title={h.name}
                  onClick={() => { formatSelection({ bgColor: h.value }); setShowHighlightPicker(false); }}
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform text-[9px] font-bold text-gray-700 flex items-center justify-center"
                  style={{ backgroundColor: h.value }}
                >
                  {h.value === 'transparent' ? '✕' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

        {/* Heading */}
        <button
          type="button"
          onClick={() => formatSelection({ isTitle: true })}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1 text-xs font-semibold"
          title="Transformar em Título"
        >
          <Heading size={14} />
          <span className="hidden sm:inline">Título</span>
        </button>

        {/* Nota / Callout */}
        <button
          type="button"
          onClick={() => formatSelection({ isNote: true, bold: true })}
          className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 text-xs font-semibold"
          title="Inserir Bloco de Nota"
        >
          <AlertCircle size={14} />
          <span>Nota</span>
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-0.5" />

        {/* Padrões Rápidos (Presets configurados) */}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors shadow-sm"
            title="Padrões de formatação configurados"
          >
            <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
            <span>Padrões ({presets.length})</span>
            <ChevronDown size={11} />
          </button>

          {showPresetsMenu && (
            <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-30 w-56 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-0.5">
                Aplicar Formatação Pré-definida
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors group"
                >
                  <span
                    className="font-semibold truncate"
                    style={{
                      color: preset.textColor || undefined,
                      backgroundColor: preset.highlightColor || undefined,
                      padding: preset.highlightColor ? '1px 4px' : undefined,
                      borderRadius: '3px',
                      fontStyle: preset.italic ? 'italic' : 'normal',
                    }}
                  >
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-gray-400 group-hover:text-blue-600">Aplicar</span>
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                <a
                  href="/settings?tab=formatting"
                  target="_blank"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-2 block py-0.5"
                >
                  ⚙️ Gerenciar Padrões nas Configurações
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="p-3 text-xs text-gray-800 dark:text-gray-100 outline-none leading-relaxed overflow-y-auto max-h-[360px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none"
      />
    </div>
  );
}
