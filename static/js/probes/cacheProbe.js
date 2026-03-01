// static/js/probes/cacheProbe.js

/**
 * Тест кэша v10.0 — Парные значения вокруг степеней двойки
 * Для каждого 2^n тестируем (2^n - 2) и (2^n + 2)
 */
export async function runCacheProbe() {
    const result = {
        wasmOk: false,
        sizes: [],
        latencies: [],
        coreCount: navigator.hardwareConcurrency || 1,
        estimatedL3SizeKB: null,
        cacheAnalysis: {}
    };

    console.log('[PROBE] Starting cache probe v10.0 (pair testing)...');
    console.log('[PROBE] CPU Cores:', result.coreCount);

    // 🔥 Парные значения вокруг степеней двойки (в KB)
    // 4±2, 8±2, 16±2, 32±2, 64±2, 128±2, 256±2, 512±2, 1024±2, 2048±2, 4096±2
    const testSizesKB = [
        2, 6,       // вокруг 4
        6, 10,      // вокруг 8
        14, 18,     // вокруг 16
        30, 34,     // вокруг 32
        62, 66,     // вокруг 64
        126, 130,   // вокруг 128
        254, 258,   // вокруг 256
        510, 514,   // вокруг 512
        1022, 1026, // вокруг 1024
        2046, 2050, // вокруг 2048
        4094, 4098  // вокруг 4096
    ];

    result.sizes = testSizesKB;
    result.latencies = [];

    for (const sizeKB of testSizesKB) {
        const bytes = sizeKB * 1024;
        console.log(`[PROBE] Testing size: ${sizeKB} KB`);
        
        try {
            const latency = await measurePointerChasing(bytes);
            result.latencies.push(latency);
            console.log(`[PROBE] Result: ${latency.toFixed(6)} ms`);
        } catch (err) {
            console.warn(`[PROBE ERROR] Size ${sizeKB} KB failed:`, err);
            result.latencies.push(null);
        }

        await new Promise(r => setTimeout(r, 50));
    }

    // Монотонность
    for (let i = 1; i < result.latencies.length; i++) {
        if (result.latencies[i] !== null && result.latencies[i-1] !== null) {
            if (result.latencies[i] < result.latencies[i-1]) {
                result.latencies[i] = result.latencies[i-1];
            }
        }
    }

    // Анализ
    result.cacheAnalysis = analyzePairs(result.sizes, result.latencies);
    result.estimatedL3SizeKB = result.cacheAnalysis.l3Boundary;

    console.log('[PROBE] Analysis:', result.cacheAnalysis);

    return result;
}

async function measurePointerChasing(bufferSize) {
    const buffer = new Uint32Array(bufferSize / 4);
    const stride = 16;
    const numNodes = Math.floor(buffer.length / stride) - 2;
    
    if (numNodes < 10) return 0;

    for (let i = 0; i < numNodes; i++) {
        buffer[i * stride] = ((i + 1) % numNodes) * stride;
    }

    // 🔥 Уменьшено до 5 итераций для скорости
    const iterations = 5;
    const numRuns = 3;
    const samples = [];

    for (let run = 0; run < numRuns; run++) {
        let idx = 0;
        for (let i = 0; i < 100; i++) { idx = buffer[idx]; }

        const start = performance.now();
        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 0; i < numNodes; i++) { idx = buffer[idx]; }
        }
        const end = performance.now();
        
        samples.push((end - start) / iterations);
        await new Promise(r => setTimeout(r, 5));
    }

    if (samples.length === 0) return 0;
    const sum = samples.reduce((a, b) => a + b, 0);
    return parseFloat((sum / samples.length).toFixed(6));
}

/**
 * 🔥 Анализ парных значений
 * Сравнивает задержки между парами вокруг каждой степени двойки
 */
function analyzePairs(sizes, latencies) {
    const analysis = {
        l3Boundary: null,
        pairs: [],
        biggestJump: null
    };

    if (!sizes || sizes.length === 0) return analysis;

    // Группируем по парам
    const pairs = [];
    for (let i = 0; i < sizes.length - 1; i += 2) {
        const size1 = sizes[i];
        const size2 = sizes[i + 1];
        const lat1 = latencies[i];
        const lat2 = latencies[i + 1];
        
        if (lat1 && lat2 && lat1 > 0 && lat2 > 0) {
            const jump = lat2 - lat1;
            const relJump = jump / lat1;
            const center = (size1 + size2) / 2;
            
            pairs.push({
                size1: size1,
                size2: size2,
                lat1: lat1,
                lat2: lat2,
                jump: jump,
                relJump: relJump,
                center: center
            });
        }
    }

    analysis.pairs = pairs.map(p => ({
        size1: p.size1,
        size2: p.size2,
        lat1: parseFloat(p.lat1.toFixed(6)),
        lat2: parseFloat(p.lat2.toFixed(6)),
        jump: parseFloat(p.jump.toFixed(6)),
        relJump: parseFloat((p.relJump * 100).toFixed(1)) + '%'
    }));

    // Находим пару с наибольшим скачком
    if (pairs.length > 0) {
        pairs.sort((a, b) => b.jump - a.jump);
        const best = pairs[0];
        
        analysis.biggestJump = {
            size1: best.size1,
            size2: best.size2,
            lat1: parseFloat(best.lat1.toFixed(6)),
            lat2: parseFloat(best.lat2.toFixed(6)),
            jump: parseFloat(best.jump.toFixed(6)),
            relJump: parseFloat((best.relJump * 100).toFixed(1)) + '%'
        };
        
        // L3 = центр пары с наибольшим скачком, округлённый до степени двойки
        analysis.l3Boundary = roundToPowerOf2(best.center);
    }

    return analysis;
}

function roundToPowerOf2(value) {
    if (value <= 0) return 2048;
    
    const cacheSizes = [256, 512, 1024, 2048, 4096, 8192];
    
    let closest = cacheSizes[0];
    let minDiff = Math.abs(value - closest);
    
    for (const size of cacheSizes) {
        const diff = Math.abs(value - size);
        if (diff < minDiff) {
            minDiff = diff;
            closest = size;
        }
    }
    
    return closest;
}
