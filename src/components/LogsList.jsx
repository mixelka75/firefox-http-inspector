import React, { useRef, useEffect } from 'react';
import { LogEntry } from './LogEntry';
import { Loader2, Inbox } from 'lucide-react';

export function LogsList({ logs, isLoading, selectedLogId, onSelectLog }) {
  const containerRef = useRef(null);
  const shouldScrollRef = useRef(true);

  // Автоскролл при новых логах
  useEffect(() => {
    if (shouldScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  // Отслеживание позиции скролла
  const handleScroll = () => {
    if (containerRef.current) {
      shouldScrollRef.current = containerRef.current.scrollTop < 100;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-dark-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Загрузка логов...</span>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-dark-400">
          <Inbox className="w-12 h-12" />
          <span className="text-lg">Нет логов</span>
          <span className="text-sm">Откройте веб-страницы для перехвата запросов</span>
        </div>
      </div>
    );
  }

  // Показываем последние сверху
  const reversedLogs = [...logs].reverse();

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
    >
      {reversedLogs.map((log) => (
        <LogEntry
          key={log.id}
          log={log}
          isSelected={log.id === selectedLogId}
          onSelect={() => onSelectLog(log.id)}
        />
      ))}
    </div>
  );
}
