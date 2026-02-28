// static/js/core/report.js

export function collectBaseData() {
  const data = {
    navigator: {},
    screen: {},
    timing: {},
    timestamp: new Date().toISOString()
  };

  // Базовые navigator свойства (без userAgent, чтобы не спойлерить)
  try {
    data.navigator.hardwareConcurrency = navigator.hardwareConcurrency ?? '?';
    data.navigator.deviceMemory = navigator.deviceMemory ?? '?';
    data.navigator.maxTouchPoints = navigator.maxTouchPoints ?? 0;
    data.navigator.platform = navigator.platform ?? '?';
    data.navigator.language = navigator.language ?? '?';
  } catch (e) {
    data.navigator.error = e.message || 'Access denied';
  }

  // Экранные метрики (очень полезны для мобильных устройств)
  try {
    const screen = window.screen;
    data.screen = {
      width: screen.width ?? '?',
      height: screen.height ?? '?',
      availWidth: screen.availWidth ?? '?',
      availHeight: screen.availHeight ?? '?',
      pixelDepth: screen.pixelDepth ?? '?',
      colorDepth: screen.colorDepth ?? '?',
      devicePixelRatio: window.devicePixelRatio?.toFixed(2) ?? '?'
    };
  } catch (e) {
    data.screen.error = e.message || 'Access denied';
  }

  // Быстрый базовый тайминг (простой loop для грубой оценки)
  try {
    const start = performance.now();
    let x = 0;
    for (let i = 0; i < 50000000; i++) {
      x = (x + 1) * 1.41421356237;
    }
    const end = performance.now();
    data.timing = {
      simpleLoopMs: (end - start).toFixed(1),
      iterations: 50000000
    };
  } catch (e) {
    data.timing = { error: e.message };
  }

  return data;
}
