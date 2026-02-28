// static/js/main.js
import { collectBaseData } from './core/report.js';
import { runCacheProbe } from './probes/cacheProbe.js';

export async function startTest() {
  const report = {};

  // 1. Собираем базовые данные (navigator, экран и т.д.)
  Object.assign(report, collectBaseData());

  // 2. Запускаем основной тест на L1-кэш
  try {
    const cacheResult = await runCacheProbe();
    report.cacheProbe = cacheResult;

    // Простая оценка размера L1
    if (cacheResult.latencies && cacheResult.sizes) {
      const jumpIndex = findLatencyJump(cacheResult.latencies);
      if (jumpIndex !== -1) {
        report.estimatedL1SizeKB = cacheResult.sizes[jumpIndex];
        report.latencyJump = cacheResult.latencies[jumpIndex] - cacheResult.latencies[jumpIndex - 1] || 0;
        report.minLatency = Math.min(...cacheResult.latencies);
      }
    }
  } catch (err) {
    report.error = err.message || String(err);
  }

  return report;
}

// Простая функция поиска скачка задержки (где разница максимальна)
function findLatencyJump(latencies) {
  if (latencies.length < 3) return -1;

  let maxDiff = 0;
  let jumpIndex = -1;

  for (let i = 1; i < latencies.length; i++) {
    const diff = latencies[i] - latencies[i - 1];
    if (diff > maxDiff && diff > 1.5) {  // порог в 1.5 мс — можно калибровать
      maxDiff = diff;
      jumpIndex = i;
    }
  }

  return jumpIndex;
}
