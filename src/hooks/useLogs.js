import { useState, useEffect, useCallback, useRef } from 'react';

export function useLogs() {
  const [logs, setLogs] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [urlFilter, setUrlFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const portRef = useRef(null);

  // Загрузка логов
  const loadLogs = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'get-logs' });
      setLogs(response?.logs || []);
    } catch (e) {
      console.error('Ошибка загрузки логов:', e);
    }
  }, []);

  // Получение статуса
  const loadStatus = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'get-status' });
      setIsEnabled(response?.isEnabled ?? true);
      setUrlFilter(response?.urlFilter || '');
    } catch (e) {
      console.error('Ошибка загрузки статуса:', e);
    }
  }, []);

  // Подключение к real-time потоку
  useEffect(() => {
    // Начальная загрузка
    Promise.all([loadLogs(), loadStatus()]).finally(() => setIsLoading(false));

    // Подключаемся к потоку обновлений
    try {
      portRef.current = browser.runtime.connect({ name: 'logs-stream' });

      portRef.current.onMessage.addListener((message) => {
        if (message.type === 'new-log') {
          setLogs(prev => [...prev, message.log]);
        }
      });

      portRef.current.onDisconnect.addListener(() => {
        // Переподключение через 1 секунду
        setTimeout(() => {
          try {
            portRef.current = browser.runtime.connect({ name: 'logs-stream' });
          } catch (e) {
            console.error('Ошибка переподключения:', e);
          }
        }, 1000);
      });
    } catch (e) {
      console.error('Ошибка подключения к потоку:', e);
    }

    return () => {
      try {
        portRef.current?.disconnect();
      } catch (e) {}
    };
  }, [loadLogs, loadStatus]);

  // Включение/выключение логирования
  const toggleEnabled = useCallback(async () => {
    try {
      await browser.runtime.sendMessage({ type: 'set-enabled', enabled: !isEnabled });
      setIsEnabled(!isEnabled);
    } catch (e) {
      console.error('Ошибка переключения:', e);
    }
  }, [isEnabled]);

  // Установка фильтра URL
  const setFilter = useCallback(async (filter) => {
    try {
      await browser.runtime.sendMessage({ type: 'set-filter', filter });
      setUrlFilter(filter);
    } catch (e) {
      console.error('Ошибка установки фильтра:', e);
    }
  }, []);

  // Очистка логов
  const clearLogs = useCallback(async () => {
    try {
      await browser.runtime.sendMessage({ type: 'clear-logs' });
      setLogs([]);
    } catch (e) {
      console.error('Ошибка очистки логов:', e);
    }
  }, []);

  // Экспорт логов
  const exportLogs = useCallback(() => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `http-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // Фильтрация логов
  const filteredLogs = logs.filter(log => {
    // Фильтр по типу
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const str = JSON.stringify(log).toLowerCase();
      if (!str.includes(query)) return false;
    }

    return true;
  });

  return {
    logs: filteredLogs,
    totalCount: logs.length,
    isEnabled,
    urlFilter,
    typeFilter,
    searchQuery,
    isLoading,
    toggleEnabled,
    setFilter,
    setTypeFilter,
    setSearchQuery,
    clearLogs,
    exportLogs,
    refresh: loadLogs
  };
}
