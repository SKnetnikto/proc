// static/js/main.js
import { runCacheProbe } from './probes/cacheProbe.js';

export async function startTest() {
    console.log('[TEST] Starting L3 cache detection...');
    
    const report = {
        coreCount: navigator.hardwareConcurrency || 1,
        timestamp: new Date().toISOString()
    };
    
    try {
        const cacheResult = await runCacheProbe();
        
        report.estimatedL3SizeKB = cacheResult.estimatedL3SizeKB;
        report.sizes = cacheResult.sizes;
        report.latencies = cacheResult.latencies;
        report.cacheAnalysis = cacheResult.cacheAnalysis;
        report.wasmOk = cacheResult.wasmOk;
        
    } catch (err) {
        report.error = err.message || String(err);
        console.error('[TEST ERROR]', err);
    }
    
    return report;
}
