// static/js/probes/cacheProbe.js

let wasmModule = null;
let wasmMemory = null;

// 🔥 Функция для вывода логов на страницу
function logToPage(message, type = 'info') {
    const logDiv = document.getElementById('wasm-log');
    if (logDiv) {
        const color = type === 'error' ? 'red' : type === 'success' ? 'green' : '#555';
        logDiv.innerHTML += `<div style="color:${color}; font-size:0.8rem;">${message}</div>`;
    }
    console.log('[PROBE]', message);
}

async function initWasm() {
    if (wasmModule) return true;
    
    try {
        logToPage('Loading WASM...');
        
        const response = await fetch('/static/probe.wasm');
        if (!response.ok) throw new Error('WASM file not found: ' + response.status + ' ' + response.statusText);
        
        const bytes = await response.arrayBuffer();
        logToPage('WASM loaded: ' + bytes.byteLength + ' bytes');
        
        const { instance } = await WebAssembly.instantiate(bytes);
        
        wasmModule = instance.exports;
        wasmMemory = instance.exports.memory || null;
        
        logToPage('Memory: ' + (wasmMemory ? 'OK' : 'NONE'), 'success');
        logToPage('run_test: ' + (typeof wasmModule.run_test === 'function' ? 'OK' : 'MISSING'), 'success');
        
        return true;
    } catch (err) {
        logToPage('WASM ERROR: ' + err.message, 'error');
        return false;
    }
}

export async function runCacheProbe() {
    const result = {
        wasmOk: false,
        sizes: [],
        latencies: [],
        coreCount: navigator.hardwareConcurrency || 1,
        cacheLevels: { l1: null, l2: null, l3: null },
        cacheAnalysis: {}
    };

    logToPage('Starting cache probe v11.0...');
    logToPage('CPU Cores: ' + result.coreCount);

    const testSizesKB = [
        2, 6, 6, 10, 14, 18, 30, 34, 62, 66,
        126, 130, 254, 258, 510, 514, 1022, 1026, 2046, 2050, 4094, 4098
    ];

    result.sizes = testSizesKB;
    result.latencies = [];

    result.wasmOk = await initWasm();
    logToPage('WASM available: ' + result.wasmOk, result.wasmOk ? 'success' : 'error');

    for (const sizeKB of testSizesKB) {
        const bytes = sizeKB * 1024;
        logToPage('Testing: ' + sizeKB + ' KB');
        
        try {
            const latency = await measurePointerChasing(bytes);
            result.latencies.push(latency);
            logToPage('Result: ' + latency.toFixed(6) + ' ms');
        } catch (err) {
            logToPage('ERROR ' + sizeKB + ' KB: ' + err.message, 'error');
            result.latencies.push(null);
        }

        await new Promise(r => setTimeout(r, 30));
    }

    // Монотонность
    for (let i = 1; i < result.latencies.length; i++) {
        if (result.latencies[i] !== null && result.latencies[i-1] !== null) {
            if (result.latencies[i] < result.latencies[i-1]) {
                result.latencies[i] = result.latencies[i-1];
            }
        }
    }

    result.cacheAnalysis = detectAllTransitions(result.sizes, result.latencies);
    result.cacheLevels = result.cacheAnalysis.levels;

    logToPage('L1: ' + result.cacheLevels.l1 + ', L2: ' + result.cacheLevels.l2 + ', L3: ' + result.cacheLevels.l3, 'success');

    return result;
}

async function measurePointerChasing(bufferSize) {
    const iterations = 100;
    const numRuns = 3;
    const samples = [];

    for (let run = 0; run < numRuns; run++) {
        if (wasmModule && wasmModule.run_test) {
            wasmModule.run_test(bufferSize, 16, 10);
        }

        const start = performance.now();
        
        if (wasmModule && wasmModule.run_test) {
            wasmModule.run_test(bufferSize, 16, iterations);
        }
        
        const end = performance.now();
        
        const avgMs = (end - start) / iterations;
        samples.push(avgMs);
        
        await new Promise(r => setTimeout(r, 3));
    }

    if (samples.length === 0) return 0;
    
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    
    return parseFloat(median.toFixed(6));
}

function detectAllTransitions(sizes, latencies) {
    const analysis = { levels: { l1: null, l2: null, l3: null }, allJumps: [], top3: [] };
    if (!sizes || sizes.length === 0) return analysis;

    const jumps = [];
    for (let i = 2; i < sizes.length; i++) {
        const prev = latencies[i - 1];
        const curr = latencies[i];
        if (!prev || !curr || prev <= 0 || curr <= 0) continue;
        const absJump = curr - prev;
        const relJump = absJump / prev;
        if (absJump > 0.0005 && relJump > 0.10) {
            jumps.push({ index: i, size: sizes[i], absJump, relJump, latency: curr });
        }
    }

    analysis.allJumps = jumps.map(j => ({ size: j.size, absJump: parseFloat(j.absJump.toFixed(6)), relJump: parseFloat((j.relJump * 100).toFixed(1)) + '%' }));

    if (jumps.length === 0) return analysis;

    jumps.sort((a, b) => (b.relJump * b.absJump) - (a.relJump * a.absJump));

    const l1Candidates = jumps.filter(j => j.size >= 32 && j.size <= 256);
    const l2Candidates = jumps.filter(j => j.size >= 256 && j.size <= 1024);
    const l3Candidates = jumps.filter(j => j.size >= 1024);

    if (l1Candidates.length > 0) { l1Candidates.sort((a, b) => b.relJump - a.relJump); analysis.levels.l1 = roundToPowerOf2(l1Candidates[0].size); }
    if (l2Candidates.length > 0) { l2Candidates.sort((a, b) => b.relJump - a.relJump); analysis.levels.l2 = roundToPowerOf2(l2Candidates[0].size); }
    if (l3Candidates.length > 0) { l3Candidates.sort((a, b) => b.relJump - a.relJump); analysis.levels.l3 = roundToPowerOf2(l3Candidates[0].size); }

    analysis.top3 = jumps.slice(0, 3).map(j => ({ size: j.size, absJump: parseFloat(j.absJump.toFixed(6)), relJump: parseFloat((j.relJump * 100).toFixed(1)) + '%', level: j.size >= 1024 ? 'L3→RAM' : j.size >= 256 ? 'L2→L3' : 'L1→L2' }));

    return analysis;
}

function roundToPowerOf2(value) {
    if (value <= 0) return null;
    const cacheSizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    let closest = cacheSizes[0];
    let minDiff = Math.abs(value - closest);
    for (const size of cacheSizes) {
        const diff = Math.abs(value - size);
        if (diff < minDiff) { minDiff = diff; closest = size; }
    }
    return closest;
}
