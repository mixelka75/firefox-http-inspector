import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

// Лимит символов для сворачивания
const COLLAPSE_THRESHOLD = 500;
const PREVIEW_LINES = 8;

function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1 hover:bg-dark-600 rounded transition-colors ${className}`}
      title="Копировать"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-dark-400" />
      )}
    </button>
  );
}

// Определение типа контента
function detectContentType(text, contentTypeHeader) {
  if (!text) return 'text';

  const header = (contentTypeHeader || '').toLowerCase();

  // По заголовку Content-Type
  if (header.includes('application/json')) return 'json';
  if (header.includes('text/html')) return 'html';
  if (header.includes('text/xml') || header.includes('application/xml')) return 'xml';
  if (header.includes('text/css')) return 'css';
  if (header.includes('javascript')) return 'javascript';
  if (header.includes('text/plain')) return 'text';

  // Автоопределение по содержимому
  const trimmed = text.trim();

  // JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {}
  }

  // HTML
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') ||
      (trimmed.startsWith('<') && trimmed.includes('</') && trimmed.endsWith('>'))) {
    return 'html';
  }

  // XML
  if (trimmed.startsWith('<?xml')) {
    return 'xml';
  }

  // URL-encoded form data
  if (/^[\w-]+=[\w%+-]*(&[\w-]+=[\w%+-]*)*$/.test(trimmed)) {
    return 'form-urlencoded';
  }

  return 'text';
}

// Форматирование JSON
function formatJson(text) {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

// Форматирование URL-encoded данных
function formatUrlEncoded(text) {
  try {
    const params = new URLSearchParams(text);
    const lines = [];
    for (const [key, value] of params) {
      lines.push(`${key}: ${decodeURIComponent(value)}`);
    }
    return lines.join('\n');
  } catch {
    return text;
  }
}

// Подсветка синтаксиса JSON
function highlightJson(text) {
  return text
    // Строки (ключи и значения)
    .replace(/"([^"\\]|\\.)*"/g, (match) => {
      // Проверяем, это ключ или значение
      return `<span class="text-amber-300">${escapeHtml(match)}</span>`;
    })
    // Числа
    .replace(/\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span class="text-purple-400">$1</span>')
    // Boolean и null
    .replace(/\b(true|false|null)\b/g, '<span class="text-pink-400">$1</span>')
    // Скобки
    .replace(/([{}[\]])/g, '<span class="text-dark-400">$1</span>');
}

// Подсветка HTML/XML
function highlightHtml(text) {
  return escapeHtml(text)
    // Теги
    .replace(/&lt;(\/?)([\w-]+)/g, '&lt;$1<span class="text-pink-400">$2</span>')
    // Атрибуты
    .replace(/([\w-]+)=(&quot;|&#39;)/g, '<span class="text-amber-300">$1</span>=<span class="text-green-400">$2')
    // Закрытие значения атрибута
    .replace(/(&quot;|&#39;)(?=[\s>]|$)/g, '$1</span>')
    // Закрывающая скобка
    .replace(/(\/?&gt;)/g, '<span class="text-dark-400">$1</span>')
    // Комментарии
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-dark-500">$1</span>');
}

// Подсветка CSS
function highlightCss(text) {
  return escapeHtml(text)
    // Селекторы (упрощённо)
    .replace(/([.#]?[\w-]+)\s*\{/g, '<span class="text-pink-400">$1</span> {')
    // Свойства
    .replace(/([\w-]+)\s*:/g, '<span class="text-cyan-400">$1</span>:')
    // Значения в кавычках
    .replace(/(&quot;|&#39;)([^&]*)(&quot;|&#39;)/g, '<span class="text-green-400">$1$2$3</span>')
    // Числа и единицы
    .replace(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|s|ms)?\b/g, '<span class="text-purple-400">$1$2</span>')
    // Цвета
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="text-amber-300">$1</span>');
}

// Подсветка JavaScript
function highlightJs(text) {
  return escapeHtml(text)
    // Ключевые слова
    .replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|this|class|extends|import|export|from|async|await|try|catch|throw)\b/g,
      '<span class="text-pink-400">$1</span>')
    // Строки
    .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`)/g, '<span class="text-green-400">$1</span>')
    // Числа
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-purple-400">$1</span>')
    // Boolean и null
    .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-amber-300">$1</span>')
    // Комментарии однострочные
    .replace(/(\/\/.*$)/gm, '<span class="text-dark-500">$1</span>');
}

// Подсветка form-urlencoded
function highlightUrlEncoded(text) {
  return text
    .split('\n')
    .map(line => {
      const [key, ...valueParts] = line.split(': ');
      const value = valueParts.join(': ');
      return `<span class="text-cyan-400">${escapeHtml(key)}</span>: <span class="text-green-400">${escapeHtml(value)}</span>`;
    })
    .join('\n');
}

// Экранирование HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Получение подсвеченного контента
function getHighlightedContent(text, type) {
  switch (type) {
    case 'json':
      return highlightJson(formatJson(text));
    case 'html':
    case 'xml':
      return highlightHtml(text);
    case 'css':
      return highlightCss(text);
    case 'javascript':
      return highlightJs(text);
    case 'form-urlencoded':
      return highlightUrlEncoded(formatUrlEncoded(text));
    default:
      return escapeHtml(text);
  }
}

// Метка типа контента
function ContentTypeBadge({ type }) {
  const colors = {
    json: 'bg-amber-500/20 text-amber-400',
    html: 'bg-orange-500/20 text-orange-400',
    xml: 'bg-orange-500/20 text-orange-400',
    css: 'bg-blue-500/20 text-blue-400',
    javascript: 'bg-yellow-500/20 text-yellow-400',
    'form-urlencoded': 'bg-purple-500/20 text-purple-400',
    text: 'bg-dark-600 text-dark-400'
  };

  const labels = {
    json: 'JSON',
    html: 'HTML',
    xml: 'XML',
    css: 'CSS',
    javascript: 'JS',
    'form-urlencoded': 'Form Data',
    text: 'Text'
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[type] || colors.text}`}>
      {labels[type] || 'Text'}
    </span>
  );
}

export function ContentViewer({ content, contentType: contentTypeHeader, title }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const text = content || '';
  const contentType = useMemo(() => detectContentType(text, contentTypeHeader), [text, contentTypeHeader]);

  // Форматированный текст для подсчёта строк
  const formattedText = useMemo(() => {
    if (contentType === 'json') return formatJson(text);
    if (contentType === 'form-urlencoded') return formatUrlEncoded(text);
    return text;
  }, [text, contentType]);

  const lines = formattedText.split('\n');
  const isLarge = lines.length > PREVIEW_LINES || text.length > COLLAPSE_THRESHOLD;

  // Превью (первые N строк)
  const previewText = useMemo(() => {
    if (!isLarge || isExpanded) return formattedText;
    return lines.slice(0, PREVIEW_LINES).join('\n') + (lines.length > PREVIEW_LINES ? '\n...' : '');
  }, [formattedText, isLarge, isExpanded, lines]);

  // Подсвеченный контент
  const highlightedContent = useMemo(() => {
    const textToHighlight = isExpanded ? formattedText : previewText;
    return getHighlightedContent(textToHighlight, contentType);
  }, [formattedText, previewText, isExpanded, contentType]);

  // Отслеживание скролла для плавающей кнопки
  useEffect(() => {
    if (!isExpanded || !containerRef.current) return;

    const handleScroll = () => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      // Показываем кнопку если контент виден и прокручен
      setShowFloatingButton(rect.top < 100 && rect.bottom > 150);
    };

    const scrollContainer = containerRef.current.closest('.overflow-auto') || window;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  if (!text) {
    return <span className="text-dark-400 text-xs">Нет данных</span>;
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {title && <span className="text-dark-400 text-xs">{title}</span>}
          <ContentTypeBadge type={contentType} />
          <span className="text-dark-500 text-xs">
            {text.length.toLocaleString()} символов • {lines.length} строк
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={formattedText} />
          {isLarge && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded transition-colors"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  Свернуть
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3" />
                  Раскрыть всё
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Контент */}
      <div
        ref={contentRef}
        className={`relative bg-dark-900 rounded border border-dark-700 overflow-hidden ${
          isExpanded ? 'max-h-[80vh] overflow-auto' : ''
        }`}
      >
        <pre
          className="p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />

        {/* Градиент для свёрнутого контента */}
        {isLarge && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-dark-900 to-transparent pointer-events-none" />
        )}

        {/* Кнопка раскрытия внизу превью */}
        {isLarge && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-dark-700/90 hover:bg-dark-600 rounded-full transition-colors backdrop-blur-sm border border-dark-600"
            >
              <ChevronDown className="w-3 h-3" />
              Показать всё ({lines.length} строк)
            </button>
          </div>
        )}

        {/* Плавающая кнопка сворачивания */}
        {isExpanded && showFloatingButton && (
          <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10">
            <button
              onClick={() => {
                setIsExpanded(false);
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-full transition-colors shadow-lg"
            >
              <ChevronUp className="w-3 h-3" />
              Свернуть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentViewer;
