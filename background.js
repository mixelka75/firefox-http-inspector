// HTTP Отладчик - Background Script
// Перехват ВСЕХ HTTP запросов и ответов

const state = {
  logs: [],
  isEnabled: true,
  urlFilter: '',
  maxLogs: 10000,
  listeners: new Set()
};

const requestData = new Map();

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

function notifyListeners(log) {
  state.listeners.forEach(port => {
    try {
      port.postMessage({ type: 'new-log', log });
    } catch (e) {
      state.listeners.delete(port);
    }
  });
}

function addLog(log) {
  if (!state.isEnabled) return;
  if (state.urlFilter && !log.url?.includes(state.urlFilter)) return;

  state.logs.push(log);
  if (state.logs.length > state.maxLogs) {
    state.logs = state.logs.slice(-state.maxLogs);
  }

  if (state.logs.length % 50 === 0) {
    saveLogs();
  }

  notifyListeners(log);
}

async function saveLogs() {
  try {
    await browser.storage.local.set({ logs: state.logs });
  } catch (e) {
    console.error('Ошибка сохранения:', e);
  }
}

async function loadLogs() {
  try {
    const data = await browser.storage.local.get(['logs', 'isEnabled', 'urlFilter']);
    state.logs = data.logs || [];
    state.isEnabled = data.isEnabled !== false;
    state.urlFilter = data.urlFilter || '';
  } catch (e) {
    console.error('Ошибка загрузки:', e);
  }
}

function parseCookies(headers) {
  const cookies = [];
  headers?.forEach(h => {
    if (h.name.toLowerCase() === 'cookie') {
      h.value.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        cookies.push({ name: name.trim(), value: valueParts.join('=') });
      });
    }
    if (h.name.toLowerCase() === 'set-cookie') {
      const parts = h.value.split(';');
      const [nameValue, ...attrs] = parts;
      const [name, ...valueParts] = nameValue.split('=');
      cookies.push({
        name: name.trim(),
        value: valueParts.join('='),
        attributes: attrs.map(a => a.trim()).join('; ')
      });
    }
  });
  return cookies;
}

// Конвертация ArrayBuffer в base64 - БЕЗ ДЕКОДИРОВАНИЯ
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Попытка прочитать как текст
function tryReadAsText(buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(buffer);
  } catch {
    return null;
  }
}

// Перехват запроса
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const id = details.requestId;
    let body = null;

    if (details.requestBody) {
      if (details.requestBody.formData) {
        body = { type: 'form', data: details.requestBody.formData };
      } else if (details.requestBody.raw && details.requestBody.raw.length > 0) {
        try {
          // Собираем все части
          let totalLength = 0;
          details.requestBody.raw.forEach(part => {
            if (part.bytes) totalLength += part.bytes.byteLength;
          });

          const combined = new Uint8Array(totalLength);
          let offset = 0;
          details.requestBody.raw.forEach(part => {
            if (part.bytes) {
              combined.set(new Uint8Array(part.bytes), offset);
              offset += part.bytes.byteLength;
            }
          });

          // Сохраняем как base64 И пробуем как текст
          const base64 = arrayBufferToBase64(combined.buffer);
          const text = tryReadAsText(combined.buffer);

          body = {
            type: 'raw',
            base64: base64,
            text: text,
            size: totalLength
          };
        } catch (e) {
          body = { type: 'error', error: e.message };
        }
      }
    }

    requestData.set(id, {
      id: generateId(),
      requestId: id,
      url: details.url,
      method: details.method,
      type: details.type,
      timestamp: Date.now(),
      tabId: details.tabId,
      requestBody: body,
      timing: { start: Date.now() }
    });
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// Перехват заголовков запроса
browser.webRequest.onSendHeaders.addListener(
  (details) => {
    const data = requestData.get(details.requestId);
    if (data) {
      data.requestHeaders = details.requestHeaders;
      data.requestCookies = parseCookies(details.requestHeaders);

      addLog({
        id: data.id + '-req',
        type: 'request',
        timestamp: new Date().toISOString(),
        url: data.url,
        method: data.method,
        resourceType: data.type,
        requestId: data.requestId,
        tabId: data.tabId,
        headers: data.requestHeaders,
        cookies: data.requestCookies,
        body: data.requestBody
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Перехват ответа - ВСЕ ТИПЫ
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    const data = requestData.get(details.requestId);
    if (!data) return;

    data.responseHeaders = details.responseHeaders;
    data.statusCode = details.statusCode;
    data.statusLine = details.statusLine;
    data.responseCookies = parseCookies(details.responseHeaders);
    data.timing.headersReceived = Date.now();

    const contentType = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'content-type'
    )?.value || '';

    // Перехватываем тело ответа для ВСЕХ запросов
    try {
      const filter = browser.webRequest.filterResponseData(details.requestId);
      const chunks = [];

      filter.ondata = (event) => {
        chunks.push(new Uint8Array(event.data));
        filter.write(event.data);
      };

      filter.onstop = () => {
        try {
          // Собираем все чанки
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          chunks.forEach(chunk => {
            combined.set(chunk, offset);
            offset += chunk.length;
          });

          // Сохраняем как base64 И пробуем как текст
          const base64 = arrayBufferToBase64(combined.buffer);
          const text = tryReadAsText(combined.buffer);

          data.responseBody = {
            type: 'raw',
            base64: base64,
            text: text,
            size: totalLength,
            contentType: contentType
          };
        } catch (e) {
          data.responseBody = { type: 'error', error: e.message };
        }

        data.timing.end = Date.now();

        addLog({
          id: data.id + '-res',
          type: 'response',
          timestamp: new Date().toISOString(),
          url: data.url,
          method: data.method,
          resourceType: data.type,
          requestId: data.requestId,
          tabId: data.tabId,
          statusCode: data.statusCode,
          statusLine: data.statusLine,
          headers: data.responseHeaders,
          cookies: data.responseCookies,
          body: data.responseBody,
          timing: {
            duration: data.timing.end - data.timing.start,
            ttfb: data.timing.headersReceived - data.timing.start
          }
        });

        requestData.delete(details.requestId);
        filter.close();
      };

      filter.onerror = (e) => {
        // Если фильтр не сработал, всё равно логируем ответ без тела
        addLog({
          id: data.id + '-res',
          type: 'response',
          timestamp: new Date().toISOString(),
          url: data.url,
          method: data.method,
          resourceType: data.type,
          requestId: data.requestId,
          tabId: data.tabId,
          statusCode: data.statusCode,
          statusLine: data.statusLine,
          headers: data.responseHeaders,
          cookies: data.responseCookies,
          body: { type: 'error', error: 'Не удалось перехватить тело' },
          timing: null
        });
        requestData.delete(details.requestId);
        filter.close();
      };
    } catch (e) {
      // Фильтр не поддерживается для этого запроса
      addLog({
        id: data.id + '-res',
        type: 'response',
        timestamp: new Date().toISOString(),
        url: data.url,
        method: data.method,
        resourceType: data.type,
        requestId: data.requestId,
        tabId: data.tabId,
        statusCode: data.statusCode,
        statusLine: data.statusLine,
        headers: data.responseHeaders,
        cookies: data.responseCookies,
        body: { type: 'unavailable', reason: e.message },
        timing: null
      });
      requestData.delete(details.requestId);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Ошибки
browser.webRequest.onErrorOccurred.addListener(
  (details) => {
    const data = requestData.get(details.requestId);
    if (data) {
      addLog({
        id: data.id + '-err',
        type: 'error',
        timestamp: new Date().toISOString(),
        url: data.url,
        method: data.method,
        resourceType: data.type,
        requestId: data.requestId,
        tabId: data.tabId,
        error: details.error
      });
      requestData.delete(details.requestId);
    }
  },
  { urls: ['<all_urls>'] }
);

// Сообщения
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'get-logs':
      sendResponse({ logs: state.logs });
      break;
    case 'get-status':
      sendResponse({
        isEnabled: state.isEnabled,
        urlFilter: state.urlFilter,
        logCount: state.logs.length
      });
      break;
    case 'set-enabled':
      state.isEnabled = message.enabled;
      browser.storage.local.set({ isEnabled: state.isEnabled });
      sendResponse({ success: true });
      break;
    case 'set-filter':
      state.urlFilter = message.filter;
      browser.storage.local.set({ urlFilter: state.urlFilter });
      sendResponse({ success: true });
      break;
    case 'clear-logs':
      state.logs = [];
      saveLogs();
      sendResponse({ success: true });
      break;
    case 'export-logs':
      sendResponse({ logs: state.logs });
      break;
    case 'page-request':
      // Логи от content script (fetch/XHR)
      handlePageRequest(message, sender);
      sendResponse({ success: true });
      break;
    case 'form-submit':
      // Отправка формы
      addLog({
        id: generateId() + '-form',
        type: 'form',
        timestamp: message.data.timestamp,
        url: message.data.action,
        method: message.data.method,
        tabId: sender.tab?.id,
        body: { type: 'form', data: message.data.formData }
      });
      sendResponse({ success: true });
      break;
  }
  return true;
});

// Обработка запросов от content script
function handlePageRequest(message, sender) {
  const data = message.data;
  const subtype = message.subtype;

  if (subtype === '__HTTP_DEBUG_FETCH__' || subtype === '__HTTP_DEBUG_XHR__') {
    const logId = generateId();

    // Добавляем лог запроса с данными от content script
    if (data.requestBase64 || data.requestText) {
      addLog({
        id: logId + '-req-page',
        type: 'request',
        timestamp: data.timestamp,
        url: data.url,
        method: data.method,
        resourceType: subtype.includes('FETCH') ? 'fetch' : 'xhr',
        tabId: sender.tab?.id,
        headers: [],
        cookies: [],
        body: {
          type: 'raw',
          base64: data.requestBase64,
          text: data.requestText,
          size: data.requestBase64 ? Math.ceil(data.requestBase64.length * 3 / 4) : 0
        }
      });
    }

    // Добавляем лог ответа с данными от content script
    addLog({
      id: logId + '-res-page',
      type: 'response',
      timestamp: data.timestamp,
      url: data.url,
      method: data.method,
      statusCode: data.status,
      statusLine: `HTTP ${data.status} ${data.statusText}`,
      resourceType: subtype.includes('FETCH') ? 'fetch' : 'xhr',
      tabId: sender.tab?.id,
      headers: [],
      cookies: [],
      body: {
        type: 'raw',
        base64: data.responseBase64,
        text: data.responseText,
        size: data.responseSize || 0,
        contentType: data.contentType || ''
      },
      timing: { duration: data.duration }
    });
  } else if (subtype === '__HTTP_DEBUG_FETCH_ERROR__' || subtype === '__HTTP_DEBUG_XHR_ERROR__') {
    addLog({
      id: generateId() + '-err',
      type: 'error',
      timestamp: data.timestamp,
      url: data.url,
      method: data.method,
      tabId: sender.tab?.id,
      error: data.error
    });
  }
}

// Real-time подключение
browser.runtime.onConnect.addListener((port) => {
  if (port.name === 'logs-stream') {
    state.listeners.add(port);
    port.onDisconnect.addListener(() => {
      state.listeners.delete(port);
    });
  }
});

loadLogs();
console.log('[HTTP Отладчик] Загружен - перехватываю ВСЕ запросы');
