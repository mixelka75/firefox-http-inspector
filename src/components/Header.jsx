import React from 'react';
import { Search, Filter, Trash2, Download, RefreshCw, Circle } from 'lucide-react';

export function Header({
  isEnabled,
  urlFilter,
  typeFilter,
  searchQuery,
  totalCount,
  filteredCount,
  onToggleEnabled,
  onFilterChange,
  onTypeFilterChange,
  onSearchChange,
  onClear,
  onExport,
  onRefresh
}) {
  return (
    <header className="bg-dark-800 border-b border-dark-600 p-3 sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Статус */}
        <button
          onClick={onToggleEnabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
            isEnabled
              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
              : 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
          }`}
          title={isEnabled ? 'Логирование включено' : 'Логирование выключено'}
        >
          <Circle className={`w-3 h-3 ${isEnabled ? 'fill-green-400' : 'fill-red-400'}`} />
          <span className="text-xs font-medium">
            {isEnabled ? 'Вкл' : 'Выкл'}
          </span>
        </button>

        {/* Поиск */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по URL, заголовкам, телу..."
            className="input w-full pl-9"
          />
        </div>

        {/* Фильтр по типу */}
        <div className="flex items-center gap-1">
          {['all', 'request', 'response', 'error'].map((type) => (
            <button
              key={type}
              onClick={() => onTypeFilterChange(type)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              {type === 'all' ? 'Все' : type === 'request' ? 'Запросы' : type === 'response' ? 'Ответы' : 'Ошибки'}
            </button>
          ))}
        </div>

        {/* Фильтр по URL */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            value={urlFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Фильтр URL..."
            className="input pl-9 w-40"
          />
        </div>

        {/* Действия */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onRefresh}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Обновить"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExport}
            className="btn btn-success flex items-center gap-1.5"
            title="Экспорт JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт</span>
          </button>
          <button
            onClick={onClear}
            className="btn btn-danger flex items-center gap-1.5"
            title="Очистить логи"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить</span>
          </button>
        </div>

        {/* Счётчик */}
        <div className="text-dark-400 text-xs">
          {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
        </div>
      </div>
    </header>
  );
}
