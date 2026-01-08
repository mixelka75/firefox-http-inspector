import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import { formatTime, formatUrl, getStatusClass, getMethodColor, formatDuration } from '../utils/helpers';
import { LogDetails } from './LogDetails';

export function LogEntry({ log }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusCode = log.response?.statusCode;
  const hasError = log.error || !log.response;

  return (
    <div className={`border-b border-dark-700 transition-colors ${isExpanded ? 'bg-dark-800' : 'hover:bg-dark-800/50'}`}>
      {/* Заголовок */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none"
      >
        {/* Стрелка раскрытия */}
        <div className="text-dark-400 w-4 flex-shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        {/* Время */}
        <span className="text-dark-400 text-xs w-24 flex-shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(log.timestamp)}
        </span>

        {/* Метод */}
        {log.method && (
          <span className={`font-semibold w-12 flex-shrink-0 ${getMethodColor(log.method)}`}>
            {log.method}
          </span>
        )}

        {/* Статус */}
        {statusCode ? (
          <span className={`font-semibold w-10 flex-shrink-0 ${getStatusClass(statusCode)}`}>
            {statusCode}
          </span>
        ) : hasError ? (
          <span className="text-red-400 w-10 flex-shrink-0 flex items-center">
            <AlertCircle className="w-4 h-4" />
          </span>
        ) : (
          <span className="w-10 flex-shrink-0" />
        )}

        {/* URL */}
        <span className="text-dark-200 truncate flex-1 min-w-0" title={log.url}>
          {formatUrl(log.url, 100)}
        </span>

        {/* Размер ответа */}
        {log.response?.body?.size > 0 && (
          <span className="text-dark-500 text-xs flex-shrink-0">
            {log.response.body.size > 1024
              ? `${(log.response.body.size / 1024).toFixed(1)} KB`
              : `${log.response.body.size} B`}
          </span>
        )}

        {/* Timing */}
        {log.timing?.duration > 0 && (
          <span className="text-dark-400 text-xs flex-shrink-0">
            {formatDuration(log.timing.duration)}
          </span>
        )}

        {/* Тип ресурса */}
        {log.resourceType && !['xmlhttprequest', 'fetch', 'xhr'].includes(log.resourceType) && (
          <span className="text-dark-500 text-xs flex-shrink-0 bg-dark-700 px-1.5 py-0.5 rounded">
            {log.resourceType}
          </span>
        )}
      </div>

      {/* Детали */}
      {isExpanded && <LogDetails log={log} />}
    </div>
  );
}
