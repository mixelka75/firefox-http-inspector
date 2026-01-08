import React, { useState, useEffect } from 'react';
import { useLogs } from './hooks/useLogs';
import { Header } from './components/Header';
import { LogsList } from './components/LogsList';
import { LogDetails } from './components/LogDetails';
import { X } from 'lucide-react';

export function LogsApp() {
  const {
    logs,
    totalCount,
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
    refresh
  } = useLogs();

  const [selectedLogId, setSelectedLogId] = useState(null);
  const [panelWidth, setPanelWidth] = useState(50); // процент ширины
  const [isResizing, setIsResizing] = useState(false);

  const selectedLog = logs.find(log => log.id === selectedLogId);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedLogId) {
        setSelectedLogId(null);
      }
      // Навигация стрелками
      if (selectedLogId && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const reversedLogs = [...logs].reverse();
        const currentIndex = reversedLogs.findIndex(log => log.id === selectedLogId);
        if (currentIndex === -1) return;

        let newIndex;
        if (e.key === 'ArrowUp') {
          newIndex = Math.max(0, currentIndex - 1);
        } else {
          newIndex = Math.min(reversedLogs.length - 1, currentIndex + 1);
        }
        setSelectedLogId(reversedLogs[newIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLogId, logs]);

  const handleClear = () => {
    if (window.confirm('Очистить все логи?')) {
      clearLogs();
      setSelectedLogId(null);
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogId(logId === selectedLogId ? null : logId);
  };

  const handleCloseDetails = () => {
    setSelectedLogId(null);
  };

  // Ресайз панели
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const newWidth = ((rect.right - e.clientX) / rect.width) * 100;
    setPanelWidth(Math.min(80, Math.max(25, newWidth)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  return (
    <div
      className="h-screen flex flex-col bg-dark-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Header
        isEnabled={isEnabled}
        urlFilter={urlFilter}
        typeFilter={typeFilter}
        searchQuery={searchQuery}
        totalCount={totalCount}
        filteredCount={logs.length}
        onToggleEnabled={toggleEnabled}
        onFilterChange={setFilter}
        onTypeFilterChange={setTypeFilter}
        onSearchChange={setSearchQuery}
        onClear={handleClear}
        onExport={exportLogs}
        onRefresh={refresh}
      />

      <main className="flex-1 overflow-hidden flex">
        {/* Список логов */}
        <div
          className="h-full overflow-hidden border-r border-dark-700"
          style={{ width: selectedLog ? `${100 - panelWidth}%` : '100%' }}
        >
          <LogsList
            logs={logs}
            isLoading={isLoading}
            selectedLogId={selectedLogId}
            onSelectLog={handleSelectLog}
          />
        </div>

        {/* Панель деталей */}
        {selectedLog && (
          <>
            {/* Разделитель для ресайза */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-1 bg-dark-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 ${isResizing ? 'bg-blue-500' : ''}`}
            />

            {/* Панель деталей */}
            <div
              className="h-full flex flex-col bg-dark-850"
              style={{ width: `${panelWidth}%` }}
            >
              {/* Заголовок панели */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700 bg-dark-800 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-dark-400 text-xs font-medium uppercase">Детали запроса</span>
                  <span className="text-dark-500 text-xs truncate max-w-[300px]" title={selectedLog.url}>
                    {selectedLog.method} {new URL(selectedLog.url).pathname}
                  </span>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="p-1 hover:bg-dark-600 rounded transition-colors text-dark-400 hover:text-dark-200"
                  title="Закрыть (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Содержимое */}
              <div className="flex-1 overflow-auto">
                <LogDetails log={selectedLog} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
