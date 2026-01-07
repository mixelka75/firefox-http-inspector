import React, { useState, useEffect } from 'react';
import { Circle, ExternalLink, Trash2, Download, Filter } from 'lucide-react';

export function PopupApp() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [urlFilter, setUrlFilter] = useState('');
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    // Загружаем статус
    browser.runtime.sendMessage({ type: 'get-status' }).then((response) => {
      setIsEnabled(response?.isEnabled ?? true);
      setUrlFilter(response?.urlFilter || '');
      setLogCount(response?.logCount || 0);
    });
  }, []);

  const toggleEnabled = async () => {
    await browser.runtime.sendMessage({ type: 'set-enabled', enabled: !isEnabled });
    setIsEnabled(!isEnabled);
  };

  const setFilter = async () => {
    await browser.runtime.sendMessage({ type: 'set-filter', filter: urlFilter });
  };

  const clearLogs = async () => {
    if (window.confirm('Очистить все логи?')) {
      await browser.runtime.sendMessage({ type: 'clear-logs' });
      setLogCount(0);
    }
  };

  const exportLogs = async () => {
    const response = await browser.runtime.sendMessage({ type: 'export-logs' });
    const data = JSON.stringify(response?.logs || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `http-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openLogs = () => {
    browser.tabs.create({ url: browser.runtime.getURL('logs.html') });
    window.close();
  };

  return (
    <div className="w-72 p-4 bg-dark-900 text-dark-200">
      <h1 className="text-lg font-semibold mb-4 text-dark-100">HTTP Отладчик</h1>

      {/* Статус */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">Логирование</span>
        <button
          onClick={toggleEnabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
            isEnabled
              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
              : 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
          }`}
        >
          <Circle className={`w-3 h-3 ${isEnabled ? 'fill-green-400' : 'fill-red-400'}`} />
          <span className="text-xs font-medium">
            {isEnabled ? 'Включено' : 'Выключено'}
          </span>
        </button>
      </div>

      {/* Фильтр URL */}
      <div className="mb-4">
        <label className="text-xs text-dark-400 block mb-1">Фильтр URL</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-400" />
            <input
              type="text"
              value={urlFilter}
              onChange={(e) => setUrlFilter(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setFilter()}
              placeholder="api.example.com"
              className="input w-full pl-7 text-xs"
            />
          </div>
          <button onClick={setFilter} className="btn btn-primary text-xs">
            ОК
          </button>
        </div>
      </div>

      {/* Счётчик */}
      <div className="bg-dark-800 rounded-lg p-3 mb-4">
        <div className="text-2xl font-bold text-dark-100">{logCount.toLocaleString()}</div>
        <div className="text-xs text-dark-400">записей</div>
      </div>

      {/* Действия */}
      <div className="space-y-2">
        <button
          onClick={openLogs}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Открыть логи
        </button>
        <div className="flex gap-2">
          <button
            onClick={exportLogs}
            className="flex-1 btn btn-success flex items-center justify-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт
          </button>
          <button
            onClick={clearLogs}
            className="flex-1 btn btn-danger flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Очистить
          </button>
        </div>
      </div>

      {/* Версия */}
      <div className="mt-4 pt-3 border-t border-dark-700 text-center text-xs text-dark-500">
        HTTP Отладчик v2.0
      </div>
    </div>
  );
}
