import React from 'react';
import { useLogs } from './hooks/useLogs';
import { Header } from './components/Header';
import { LogsList } from './components/LogsList';

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

  const handleClear = () => {
    if (window.confirm('Очистить все логи?')) {
      clearLogs();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dark-900">
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
      <main className="flex-1 overflow-hidden">
        <LogsList logs={logs} isLoading={isLoading} />
      </main>
    </div>
  );
}
