import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Clock, Hash, Globe, AlertCircle } from 'lucide-react';
import { formatTime, formatUrl, getStatusClass, getMethodColor, formatDuration } from '../utils/helpers';
import { LogDetails } from './LogDetails';

export function LogEntry({ log }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBadgeClass = () => {
    switch (log.type) {
      case 'request': return 'badge-request';
      case 'response': return 'badge-response';
      case 'error': return 'badge-error';
      default: return 'bg-dark-600 text-dark-200';
    }
  };

  const getTypeName = () => {
    switch (log.type) {
      case 'request': return 'ЗАПРОС';
      case 'response': return 'ОТВЕТ';
      case 'error': return 'ОШИБКА';
      default: return log.type?.toUpperCase();
    }
  };

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

        {/* Тип */}
        <span className={`badge ${getBadgeClass()} w-16 text-center`}>
          {getTypeName()}
        </span>

        {/* Время */}
        <span className="text-dark-400 text-xs w-24 flex-shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(log.timestamp)}
        </span>

        {/* Метод */}
        {log.method && (
          <span className={`font-semibold w-16 flex-shrink-0 ${getMethodColor(log.method)}`}>
            {log.method}
          </span>
        )}

        {/* Статус */}
        {log.statusCode && (
          <span className={`font-semibold w-12 flex-shrink-0 ${getStatusClass(log.statusCode)}`}>
            {log.statusCode}
          </span>
        )}

        {/* Ошибка */}
        {log.type === 'error' && (
          <span className="text-red-400 flex items-center gap-1 flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs">{log.error}</span>
          </span>
        )}

        {/* URL */}
        <span className="text-dark-200 truncate flex-1 min-w-0" title={log.url}>
          {formatUrl(log.url, 120)}
        </span>

        {/* Timing */}
        {log.timing?.duration && (
          <span className="text-dark-400 text-xs flex-shrink-0">
            {formatDuration(log.timing.duration)}
          </span>
        )}

        {/* Тип ресурса */}
        {log.resourceType && log.resourceType !== 'xmlhttprequest' && (
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
