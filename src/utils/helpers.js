// Форматирование времени
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

// Форматирование URL
export function formatUrl(url, maxLen = 100) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    const domain = parsed.host;

    if (url.length <= maxLen) return url;

    const available = maxLen - path.length - 3;
    if (available > 15) {
      const shortDomain = domain.length > available
        ? '...' + domain.slice(-available)
        : domain;
      return shortDomain + path;
    }

    return path.length > maxLen
      ? path.substring(0, maxLen - 3) + '...'
      : path;
  } catch {
    return url.length > maxLen ? url.substring(0, maxLen - 3) + '...' : url;
  }
}

// Получить только path из URL
export function getUrlPath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

// Класс статуса
export function getStatusClass(status) {
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-yellow-400';
  if (status >= 400 && status < 500) return 'text-orange-400';
  return 'text-red-400';
}

// Цвет метода
export function getMethodColor(method) {
  const colors = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
    OPTIONS: 'text-gray-400',
    HEAD: 'text-purple-400'
  };
  return colors[method?.toUpperCase()] || 'text-gray-400';
}

// Проверка на base64
export function isBase64(str) {
  if (!str || typeof str !== 'string' || str.length < 20) return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  const cleaned = str.replace(/\s/g, '');
  return base64Regex.test(cleaned) && cleaned.length % 4 === 0;
}

// Декодирование base64
export function decodeBase64(str) {
  if (!isBase64(str)) return null;
  try {
    const decoded = atob(str.replace(/\s/g, ''));
    if (/^[\x20-\x7E\r\n\t]*$/.test(decoded)) {
      try {
        return { type: 'json', data: JSON.parse(decoded) };
      } catch {
        return { type: 'text', data: decoded };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Форматирование размера
export function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Форматирование длительности
export function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
