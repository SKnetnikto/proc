# app.py
from flask import Flask, render_template, jsonify, request, send_from_directory
from datetime import datetime
import mimetypes

app = Flask(__name__)
app.config['STATIC_FOLDER'] = 'static'
app.config['TEMPLATE_FOLDER'] = 'templates'

mimetypes.add_type('application/wasm', '.wasm')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/api/log', methods=['POST'])
def log_data():
    try:
        data = request.json
        timestamp = datetime.now().isoformat()
        
        log_lines = []
        log_lines.append("=" * 60)
        log_lines.append(f"TEST RUN: {timestamp}")
        log_lines.append("=" * 60)
        
        if 'navigator' in data:
            nav = data['navigator']
            log_lines.append(f"\n📱 DEVICE INFO:")
            log_lines.append(f"  Hardware Concurrency: {nav.get('hardwareConcurrency', '?')}")
            log_lines.append(f"  Device Memory: {nav.get('deviceMemory', '?')} GB")
            log_lines.append(f"  Platform: {nav.get('platform', '?')}")
        
        log_lines.append(f"\n🖥️  CPU CORES: {data.get('coreCount', '?')}")
        log_lines.append(f"🔧 WASM OK: {data.get('wasmOk', False)}")
        
        # 🔥 Три уровня кэша
        levels = data.get('cacheLevels', {})
        log_lines.append(f"\n📊 CACHE LEVELS:")
        log_lines.append(f"  L1→L2: {levels.get('l1', '?')} KB")
        log_lines.append(f"  L2→L3: {levels.get('l2', '?')} KB")
        log_lines.append(f"  L3→RAM: {levels.get('l3', '?')} KB")
        
        if 'sizes' in data and 'latencies' in data:
            log_lines.append("\n⏱️  RAW TIMING DATA:")
            log_lines.append(f"  {'Size (KB)':<15} {'Latency (ms)':<20} {'Status'}")
            log_lines.append(f"  {'-'*15} {'-'*20} {'-'*10}")
            
            sizes = data['sizes']
            latencies = data['latencies']
            for i in range(len(sizes)):
                size = sizes[i]
                lat = latencies[i] if i < len(latencies) else None
                status = "✓" if lat and lat > 0 else "✗"
                lat_str = f"{lat:.6f}" if lat else "NULL"
                log_lines.append(f"  {size:<15} {lat_str:<20} {status}")
        
        if 'cacheAnalysis' in data:
            analysis = data['cacheAnalysis']
            log_lines.append("\n📊 TOP 3 TRANSITIONS:")
            if analysis.get('top3'):
                for i, t in enumerate(analysis['top3'], 1):
                    log_lines.append(f"  {i}. {t['size']} KB: {t['absJump']} ms ({t['relJump']}) [{t['level']}]")
        
        log_lines.append("\n")
        log_text = "\n".join(log_lines)
        
        with open('test.txt', 'a', encoding='utf-8') as f:
            f.write(log_text)
        
        print(f"[LOG] Saved at {timestamp}", flush=True)
        return jsonify({'status': 'ok'})
    
    except Exception as e:
        print(f"[LOG ERROR] {e}", flush=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 L3 CACHE DETECTOR v11.0", flush=True)
    print("🔧 WASM: static/probe.wasm", flush=True)
    print("⚡ Iterations: 100 × 3 runs", flush=True)
    print("🌐 http://127.0.0.1:5000\n", flush=True)
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
