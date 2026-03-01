// static/js/core/report.js

export function collectBaseData() {
    const data = {
        navigator: {},
        screen: {},
        timing: {},
        timestamp: new Date().toISOString()
    };
    
    // Navigator свойства
    try {
        data.navigator.hardwareConcurrency = navigator.hardwareConcurrency ?? '?';
        data.navigator.deviceMemory = navigator.deviceMemory ?? '?';
        data.navigator.maxTouchPoints = navigator.maxTouchPoints ?? 0;
        data.navigator.platform = navigator.platform ?? '?';
        data.navigator.language = navigator.language ?? '?';
    } catch (e) {
        data.navigator.error = e.message || 'Access denied';
    }
    
    // Экран
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
    
    // Быстрый тест производительности (неблокирующий, меньше итераций)
    try {
        const iterations = 5000000; // Уменьшено с 50M до 5M для отзывчивости
        const start = performance.now();
        let x = 0;
        
        for (let i = 0; i < iterations; i++) {
            x = (x + 1) * 1.41421356237;
        }
        
        const end = performance.now();
        data.timing = {
            simpleLoopMs: (end - start).toFixed(2),
            iterations: iterations,
            msPerIteration: ((end - start) / iterations).toFixed(6)
        };
    } catch (e) {
        data.timing = { error: e.message };
    }
    
    return data;
}
