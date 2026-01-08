import React, { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { getStatusClass, formatDuration } from '../utils/helpers';
import { decodeProtobuf, looksLikeProtobuf } from '../utils/protobuf';
import { ContentViewer } from './ContentViewer';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    const copyText = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-dark-600 rounded transition-colors flex-shrink-0"
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

function Section({ title, children, defaultOpen = true, count, badge }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-dark-600 rounded-lg overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-dark-700 cursor-pointer hover:bg-dark-600 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="text-blue-400 font-medium text-xs uppercase tracking-wide">{title}</span>
        {count !== undefined && (
          <span className="text-dark-400 text-xs">({count})</span>
        )}
        {badge && (
          <span className="text-dark-500 text-xs bg-dark-800 px-1.5 py-0.5 rounded">{badge}</span>
        )}
      </div>
      {isOpen && <div className="p-3 bg-dark-800">{children}</div>}
    </div>
  );
}

function HeadersTable({ headers }) {
  if (!headers || headers.length === 0) {
    return <span className="text-dark-400 text-xs">Нет заголовков</span>;
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      {headers.map((header, idx) => (
        <div key={idx} className="flex gap-2 py-1 border-b border-dark-700 last:border-0">
          <span className="text-cyan-400 min-w-[180px] flex-shrink-0 break-all text-xs">
            {header.name}:
          </span>
          <span className="text-orange-300 break-all flex-1 text-xs">{header.value}</span>
          <CopyButton text={header.value} />
        </div>
      ))}
    </div>
  );
}

function CookiesTable({ cookies }) {
  if (!cookies || cookies.length === 0) {
    return <span className="text-dark-400 text-xs">Нет куки</span>;
  }

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {cookies.map((cookie, idx) => (
        <div key={idx} className="flex gap-2 py-1 border-b border-dark-700 last:border-0">
          <span className="text-yellow-400 min-w-[150px] flex-shrink-0 text-xs">{cookie.name}:</span>
          <span className="text-dark-200 break-all flex-1 text-xs">{cookie.value}</span>
          {cookie.attributes && (
            <span className="text-dark-500 text-xs">{cookie.attributes}</span>
          )}
          <CopyButton text={cookie.value} />
        </div>
      ))}
    </div>
  );
}

function ProtobufField({ field, indent = 0 }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasNested = field.interpretations?.some(i => i.type === 'message');
  const paddingLeft = indent * 16;

  return (
    <div style={{ paddingLeft }} className="border-l border-dark-600 pl-2 my-1">
      <div
        className={`flex items-start gap-2 ${hasNested ? 'cursor-pointer' : ''}`}
        onClick={() => hasNested && setIsOpen(!isOpen)}
      >
        {hasNested && (
          <span className="text-dark-400 mt-0.5">
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        <span className="text-purple-400 font-mono text-xs">{field.index}</span>
        <span className="text-dark-500 text-xs">({field.typeName})</span>
      </div>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5">
          {field.interpretations?.map((interp, idx) => {
            if (interp.type === 'message' && Array.isArray(interp.value)) {
              return (
                <div key={idx} className="mt-1">
                  <span className="text-blue-400 text-xs">[вложенное сообщение]</span>
                  <div className="mt-1">
                    {interp.value.map((nested, nidx) => (
                      <ProtobufField key={nidx} field={nested} indent={indent + 1} />
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-cyan-400 font-mono min-w-[60px]">{interp.type}:</span>
                <span className="text-green-300 break-all font-mono">
                  {interp.type === 'string' ? `"${interp.value}"` : String(interp.value)}
                </span>
                <CopyButton text={interp.value} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProtobufViewer({ base64 }) {
  const decoded = useMemo(() => decodeProtobuf(base64), [base64]);

  if (!decoded || decoded.length === 0) {
    return <span className="text-dark-400 text-xs">Не удалось декодировать protobuf</span>;
  }

  return (
    <div className="bg-dark-900 rounded border border-purple-500/30 p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400 text-xs font-semibold uppercase">Protobuf</span>
        <span className="text-dark-500 text-xs">({decoded.length} полей)</span>
      </div>
      <div className="space-y-1 max-h-96 overflow-auto">
        {decoded.map((field, idx) => (
          <ProtobufField key={idx} field={field} />
        ))}
      </div>
    </div>
  );
}

function FormDataViewer({ data }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const entries = Object.entries(data || {});
  const PREVIEW_COUNT = 5;
  const isLarge = entries.length > PREVIEW_COUNT;
  const displayEntries = isExpanded ? entries : entries.slice(0, PREVIEW_COUNT);

  return (
    <div className="space-y-1">
      {displayEntries.map(([key, values]) => (
        <div key={key} className="flex gap-2 text-xs py-1 border-b border-dark-700 last:border-0">
          <span className="text-purple-400 font-medium min-w-[120px]">{key}:</span>
          <span className="text-dark-200 break-all flex-1">
            {Array.isArray(values) ? values.join(', ') : String(values)}
          </span>
          <CopyButton text={Array.isArray(values) ? values.join(', ') : String(values)} />
        </div>
      ))}
      {isLarge && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
        >
          {isExpanded ? 'Свернуть' : `Показать все (${entries.length} полей)`}
        </button>
      )}
    </div>
  );
}

function Base64Viewer({ base64 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const PREVIEW_LENGTH = 200;
  const isLarge = base64 && base64.length > PREVIEW_LENGTH;
  const displayText = isExpanded ? base64 : (base64?.substring(0, PREVIEW_LENGTH) + (isLarge ? '...' : ''));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-orange-400 text-xs font-semibold uppercase">Base64:</span>
        <span className="text-dark-500 text-xs">{base64?.length?.toLocaleString()} символов</span>
        <CopyButton text={base64} />
        {isLarge && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? 'Свернуть' : 'Раскрыть'}
          </button>
        )}
      </div>
      <pre className={`text-orange-300 whitespace-pre-wrap break-all text-xs bg-dark-900 p-3 rounded border-l-2 border-orange-500 ${isExpanded ? 'max-h-96' : 'max-h-24'} overflow-auto`}>
        {displayText || '[пусто]'}
      </pre>
    </div>
  );
}

function BodyViewer({ body, title }) {
  if (!body) {
    return <span className="text-dark-400 text-xs">Тело отсутствует</span>;
  }

  // Пустое тело (OPTIONS, 204, и т.д.)
  if (body.type === 'empty') {
    return (
      <div className="flex items-center gap-2 text-dark-500 text-xs">
        <span className="bg-dark-700 px-2 py-1 rounded">Пустое тело</span>
        <span className="text-dark-400">{body.reason}</span>
      </div>
    );
  }

  // Недоступно (service worker, websocket, и т.д.)
  if (body.type === 'unavailable') {
    return (
      <div className="flex items-center gap-2 text-amber-500 text-xs">
        <span className="bg-amber-500/20 px-2 py-1 rounded">Недоступно</span>
        <span className="text-dark-400">{body.reason}</span>
      </div>
    );
  }

  // Ошибка
  if (body.type === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <span className="bg-red-500/20 px-2 py-1 rounded">Ошибка</span>
        <span>{body.error || 'Не удалось получить тело'}</span>
      </div>
    );
  }

  // Form данные
  if (body.type === 'form') {
    return <FormDataViewer data={body.data} />;
  }

  // Raw данные (base64 + text)
  if (body.type === 'raw') {
    const isProtobuf = body.base64 && looksLikeProtobuf(body.base64);

    return (
      <div className="space-y-4">
        {/* Информация */}
        <div className="flex items-center gap-4 text-xs text-dark-400">
          {body.size !== undefined && <span>Размер: {body.size.toLocaleString()} байт</span>}
          {body.contentType && <span>Content-Type: {body.contentType}</span>}
          {isProtobuf && (
            <span className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">Protobuf</span>
          )}
        </div>

        {/* Protobuf - если обнаружен */}
        {isProtobuf && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-400 text-xs font-semibold uppercase">Protobuf:</span>
            </div>
            <ProtobufViewer base64={body.base64} />
          </div>
        )}

        {/* Текст с подсветкой синтаксиса - если удалось декодировать */}
        {body.text !== null && body.text !== undefined && body.text.length > 0 && (
          <ContentViewer
            content={body.text}
            contentType={body.contentType}
            title="Содержимое"
          />
        )}

        {/* Base64 - показываем отдельно для бинарных данных или если нет текста */}
        {body.base64 && (body.text === null || isProtobuf) && (
          <Base64Viewer base64={body.base64} />
        )}

        {/* Если текст недоступен */}
        {body.text === null && !isProtobuf && body.base64 && (
          <div className="text-dark-500 text-xs italic">
            Бинарные данные (не UTF-8 текст)
          </div>
        )}
      </div>
    );
  }

  // Fallback для старых данных
  return (
    <ContentViewer
      content={JSON.stringify(body, null, 2)}
      contentType="application/json"
    />
  );
}

export function LogDetails({ log }) {
  const statusCode = log.response?.statusCode;

  return (
    <div className="px-4 py-3 bg-dark-900 border-t border-dark-700 space-y-3">
      {/* Основная информация */}
      <Section title="Основная информация">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div className="flex gap-2 col-span-2">
            <span className="text-dark-400 w-28 flex-shrink-0">URL:</span>
            <span className="text-cyan-400 break-all flex-1">{log.url}</span>
            <CopyButton text={log.url} />
          </div>
          {log.method && (
            <div className="flex gap-2">
              <span className="text-dark-400 w-28">Метод:</span>
              <span className="text-orange-400 font-semibold">{log.method}</span>
            </div>
          )}
          {statusCode && (
            <div className="flex gap-2">
              <span className="text-dark-400 w-28">Статус:</span>
              <span className={`font-semibold ${getStatusClass(statusCode)}`}>
                {statusCode} {log.response?.statusLine?.split(' ').slice(1).join(' ')}
              </span>
            </div>
          )}
          {log.resourceType && (
            <div className="flex gap-2">
              <span className="text-dark-400 w-28">Тип ресурса:</span>
              <span className="text-dark-200">{log.resourceType}</span>
            </div>
          )}
          {log.requestId && (
            <div className="flex gap-2">
              <span className="text-dark-400 w-28">Request ID:</span>
              <span className="text-dark-300">{log.requestId}</span>
            </div>
          )}
          {log.timing && (
            <>
              {log.timing.duration !== undefined && (
                <div className="flex gap-2">
                  <span className="text-dark-400 w-28">Время ответа:</span>
                  <span className="text-yellow-400">{formatDuration(log.timing.duration)}</span>
                </div>
              )}
              {log.timing.ttfb !== undefined && (
                <div className="flex gap-2">
                  <span className="text-dark-400 w-28">TTFB:</span>
                  <span className="text-dark-300">{formatDuration(log.timing.ttfb)}</span>
                </div>
              )}
            </>
          )}
          {log.error && (
            <div className="flex gap-2 col-span-2">
              <span className="text-dark-400 w-28">Ошибка:</span>
              <span className="text-red-400">{log.error}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Заголовки запроса */}
      {log.request?.headers && log.request.headers.length > 0 && (
        <Section title="Заголовки запроса" count={log.request.headers.length}>
          <HeadersTable headers={log.request.headers} />
        </Section>
      )}

      {/* Куки запроса */}
      {log.request?.cookies && log.request.cookies.length > 0 && (
        <Section title="Куки запроса" count={log.request.cookies.length} defaultOpen={false}>
          <CookiesTable cookies={log.request.cookies} />
        </Section>
      )}

      {/* Тело запроса */}
      {log.request?.body && (
        <Section
          title="Тело запроса"
          badge={log.request.body.size ? `${log.request.body.size} байт` : null}
        >
          <BodyViewer body={log.request.body} title="Запрос" />
        </Section>
      )}

      {/* Заголовки ответа */}
      {log.response?.headers && log.response.headers.length > 0 && (
        <Section title="Заголовки ответа" count={log.response.headers.length}>
          <HeadersTable headers={log.response.headers} />
        </Section>
      )}

      {/* Куки ответа */}
      {log.response?.cookies && log.response.cookies.length > 0 && (
        <Section title="Куки ответа" count={log.response.cookies.length} defaultOpen={false}>
          <CookiesTable cookies={log.response.cookies} />
        </Section>
      )}

      {/* Тело ответа */}
      {log.response?.body && (
        <Section
          title="Тело ответа"
          badge={log.response.body.size ? `${log.response.body.size} байт` : null}
        >
          <BodyViewer body={log.response.body} title="Ответ" />
        </Section>
      )}
    </div>
  );
}
