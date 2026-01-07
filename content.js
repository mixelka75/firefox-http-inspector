// Content script для перехвата fetch/XHR с телами запросов/ответов
(function() {
  'use strict';

  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Конвертация ArrayBuffer в base64
      function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
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

      // Перехват fetch
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;
        const method = config?.method || 'GET';
        let requestBody = config?.body;

        // Парсим тело запроса
        let requestBase64 = null;
        let requestText = null;
        if (requestBody) {
          if (typeof requestBody === 'string') {
            requestText = requestBody;
            requestBase64 = btoa(unescape(encodeURIComponent(requestBody)));
          } else if (requestBody instanceof ArrayBuffer) {
            requestBase64 = arrayBufferToBase64(requestBody);
            requestText = tryReadAsText(requestBody);
          } else if (requestBody instanceof Uint8Array) {
            requestBase64 = arrayBufferToBase64(requestBody.buffer);
            requestText = tryReadAsText(requestBody);
          } else if (requestBody instanceof FormData) {
            const formObj = {};
            for (let [key, value] of requestBody.entries()) {
              formObj[key] = value;
            }
            requestText = JSON.stringify(formObj);
          } else if (requestBody instanceof URLSearchParams) {
            requestText = requestBody.toString();
          }
        }

        const startTime = performance.now();

        try {
          const response = await originalFetch.apply(this, args);
          const endTime = performance.now();
          const clone = response.clone();
          const contentType = response.headers.get('content-type') || '';

          // Читаем тело ответа как ArrayBuffer для поддержки бинарных данных
          clone.arrayBuffer().then(buffer => {
            const responseBase64 = arrayBufferToBase64(buffer);
            const responseText = tryReadAsText(buffer);

            window.postMessage({
              type: '__HTTP_DEBUG_FETCH__',
              data: {
                url,
                method,
                status: response.status,
                statusText: response.statusText,
                requestBase64,
                requestText,
                responseBase64,
                responseText,
                responseSize: buffer.byteLength,
                contentType,
                duration: Math.round(endTime - startTime),
                timestamp: new Date().toISOString()
              }
            }, '*');
          }).catch(err => {
            window.postMessage({
              type: '__HTTP_DEBUG_FETCH__',
              data: {
                url,
                method,
                status: response.status,
                statusText: response.statusText,
                requestBase64,
                requestText,
                responseBase64: null,
                responseText: 'Ошибка чтения ответа: ' + err.message,
                responseSize: 0,
                contentType,
                duration: Math.round(endTime - startTime),
                timestamp: new Date().toISOString()
              }
            }, '*');
          });

          return response;
        } catch (error) {
          window.postMessage({
            type: '__HTTP_DEBUG_FETCH_ERROR__',
            data: { url, method, error: error.message, timestamp: new Date().toISOString() }
          }, '*');
          throw error;
        }
      };

      // Перехват XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__debugMethod = method;
        this.__debugUrl = url;
        this.__debugStartTime = null;
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(body) {
        const xhr = this;
        xhr.__debugStartTime = performance.now();

        // Парсим тело запроса
        let requestBase64 = null;
        let requestText = null;
        if (body) {
          if (typeof body === 'string') {
            requestText = body;
            try { requestBase64 = btoa(unescape(encodeURIComponent(body))); } catch {}
          } else if (body instanceof ArrayBuffer) {
            requestBase64 = arrayBufferToBase64(body);
            requestText = tryReadAsText(body);
          } else if (body instanceof Uint8Array) {
            requestBase64 = arrayBufferToBase64(body.buffer);
            requestText = tryReadAsText(body);
          } else if (body instanceof FormData) {
            const formObj = {};
            for (let [key, value] of body.entries()) {
              formObj[key] = value;
            }
            requestText = JSON.stringify(formObj);
          }
        }
        xhr.__debugRequestBase64 = requestBase64;
        xhr.__debugRequestText = requestText;

        // Устанавливаем responseType для получения бинарных данных
        const origResponseType = xhr.responseType;

        this.addEventListener('load', function() {
          const endTime = performance.now();
          const contentType = xhr.getResponseHeader('content-type') || '';

          let responseBase64 = null;
          let responseText = null;
          let responseSize = 0;

          try {
            if (xhr.responseType === '' || xhr.responseType === 'text') {
              responseText = xhr.responseText;
              responseSize = responseText.length;
              try { responseBase64 = btoa(unescape(encodeURIComponent(responseText))); } catch {}
            } else if (xhr.responseType === 'arraybuffer' && xhr.response) {
              responseBase64 = arrayBufferToBase64(xhr.response);
              responseText = tryReadAsText(xhr.response);
              responseSize = xhr.response.byteLength;
            } else if (xhr.responseType === 'blob' && xhr.response) {
              // Для blob нужно асинхронное чтение, пока пропускаем
              responseText = '[Blob данные]';
              responseSize = xhr.response.size;
            }
          } catch (e) {
            responseText = 'Ошибка чтения: ' + e.message;
          }

          window.postMessage({
            type: '__HTTP_DEBUG_XHR__',
            data: {
              url: xhr.__debugUrl,
              method: xhr.__debugMethod,
              status: xhr.status,
              statusText: xhr.statusText,
              requestBase64: xhr.__debugRequestBase64,
              requestText: xhr.__debugRequestText,
              responseBase64,
              responseText,
              responseSize,
              contentType,
              duration: Math.round(endTime - xhr.__debugStartTime),
              timestamp: new Date().toISOString()
            }
          }, '*');
        });

        this.addEventListener('error', function() {
          window.postMessage({
            type: '__HTTP_DEBUG_XHR_ERROR__',
            data: {
              url: xhr.__debugUrl,
              method: xhr.__debugMethod,
              error: 'Network Error',
              timestamp: new Date().toISOString()
            }
          }, '*');
        });

        return originalSend.apply(this, [body]);
      };
    })();
  `;

  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // Перехват отправки форм
  document.addEventListener('submit', (e) => {
    const form = e.target;
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      if (key.toLowerCase().includes('password')) {
        data[key] = '[СКРЫТО]';
      } else {
        data[key] = value;
      }
    }

    browser.runtime.sendMessage({
      type: 'form-submit',
      data: {
        action: form.action || window.location.href,
        method: form.method || 'GET',
        formData: data,
        timestamp: new Date().toISOString()
      }
    });
  }, true);

  // Слушаем сообщения от инжектированного скрипта
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type?.startsWith('__HTTP_DEBUG_')) {
      browser.runtime.sendMessage({
        type: 'page-request',
        subtype: event.data.type,
        data: event.data.data
      });
    }
  });
})();
