// static/js/main.js
import { runCacheProbe } from './probes/cacheProbe.js';

export async function startTest() {
    console.log('[TEST] Starting cache detection v11...');
    
    const report = {
        coreCount: navigator.hardwareConcurrency || 1,
        timestamp: new Date().toISOString()
    };
    
    try {
        const cacheResult = await runCacheProbe();
        
        report.wasmOk = cacheResult.wasmOk;
        report.sizes = cacheResult.sizes;
        report.latencies = cacheResult.latencies;
        report.cacheLevels = cacheResult.cacheLevels;
        report.cacheAnalysis = cacheResult.cacheAnalysis;
        
    } catch (err) {
        report.error = err.message || String(err);
        console.error('[TEST ERROR]', err);
    }
    
    return report;
}
