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

  // Sync saved presets from localStorage and /api/settings
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const saved = localStorage.getItem('agency_text_formatting_presets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPresets(parsed);
          }
        }

        // Fetch latest from API to ensure synchronization with settings
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.text_formatting_presets) {
            const apiPresets = JSON.parse(data.settings.text_formatting_presets);
            if (Array.isArray(apiPresets) && apiPresets.length > 0) {
              setPresets(apiPresets);
              localStorage.setItem('agency_text_formatting_presets', JSON.stringify(apiPresets));
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
        setPresets(e.detail);
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
    presetName?: string;
  }) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();
    const hasContent = selectedContent.childNodes.length > 0 && selectedContent.textContent?.trim() !== '';

    if (styles.isNote) {
      // Create callout / note block
      const noteBox = document.createElement('div');
      noteBox.className = 'rich-note-callout';
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
      // Create heading block
      const h2 = document.createElement('h2');
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
      // Span inline formatting
      const span = document.createElement('span');
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
      presetName: preset.name,
    });
    setShowPresetsMenu(false);
  };

  // Find user's configured "Grifado" preset
  const grifadoPreset = presets.find((p) => {
    const n = (p.name || '').toLowerCase();
    return n.includes('grif') || n.includes('marca-texto') || n.includes('marcatexto') || n.includes('destaque');
  }) || presets.find(p => p.tag === 'p' && p.highlightColor);

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
    { name: 'Amarelo', value: grifadoPreset?.highlightColor || '#fef08a' },
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

        {/* Highlighter (Marca-texto / Grifado) */}
        <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              if (grifadoPreset) {
                applyPreset(grifadoPreset);
              } else {
                formatSelection({ bgColor: '#fef08a', color: '#111827' });
              }
            }}
            className="px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 transition-colors"
            title={grifadoPreset ? `Aplicar Padrão: ${grifadoPreset.name}` : "Grifado (Marca-texto)"}
          >
            <Highlighter size={13} />
            <span className="text-[11px] font-bold">Grifado</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Escolher outra cor de grifo"
          >
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

      {/* Faixa com Todos os Padrões de Roteiro Disponíveis */}
      {presets.length > 0 && (
        <div className="bg-gray-50/90 dark:bg-gray-850 px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 overflow-x-auto text-xs select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" /> Padrões:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-2xs border border-black/5 dark:border-white/10"
              style={{
                color: preset.textColor || (preset.highlightColor ? '#111827' : undefined),
                backgroundColor: preset.highlightColor || (preset.tag === 'note' ? '#fef3c7' : preset.tag === 'h2' ? '#dbeafe' : '#f3f4f6'),
                fontWeight: preset.bold ? 'bold' : '500',
                fontStyle: preset.italic ? 'italic' : 'normal',
                textDecoration: preset.underline ? 'underline' : 'none',
              }}
              title={`Clique para aplicar: ${preset.name}`}
            >
              {preset.name}
            </button>
          ))}
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
        className="p-3 text-xs text-gray-800 dark:text-gray-100 outline-none leading-relaxed overflow-y-auto max-h-[360px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none"
      />
    </div>
  );
}
