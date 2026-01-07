#!/bin/bash
# Скрипт сборки расширения HTTP Отладчик

set -e

echo "🔨 Сборка HTTP Отладчик..."

# Сборка React
npm run build

# Копирование файлов расширения
cp background.js content.js dist/

# Обновление manifest.json
cat > dist/manifest.json << 'EOF'
{
  "manifest_version": 2,
  "name": "HTTP Отладчик",
  "version": "2.0.0",
  "description": "Перехват и анализ HTTP запросов/ответов с телом, заголовками и куками",
  "author": "MireApprove Team",
  "homepage_url": "https://github.com/mixelka75/mireapprove",
  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "<all_urls>",
    "tabs",
    "storage",
    "cookies",
    "downloads"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "browser_action": {
    "default_title": "HTTP Отладчик",
    "default_popup": "popup.html"
  },
  "web_accessible_resources": [
    "logs.html",
    "popup.html",
    "assets/*"
  ]
}
EOF

# Исправление путей в HTML
sed -i 's|/assets/|assets/|g' dist/logs.html dist/popup.html

echo "✅ Сборка завершена! Расширение в папке dist/"
echo "📦 Для установки: about:debugging -> Загрузить временное дополнение -> dist/manifest.json"
