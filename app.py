# app.py
from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime

app = Flask(__name__)

app.config['STATIC_FOLDER'] = 'static'
app.config['TEMPLATE_FOLDER'] = 'templates'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'L3 Cache Detector is running'})

@app.route('/api/log', methods=['POST'])
def log_data():
    try:
        data = request.json
        log_entry = []
        log_entry.append("=" * 60)
        log_entry.append(f"TEST RUN: {datetime.now().isoformat()}")
        log_entry.append("=" * 60)
        
        # Инфо об устройстве
        if 'navigator' in data:
            log_entry.append("\n📱 DEVICE INFO:")
            nav = data['navigator']
            log_entry.append(f"  Hardware Concurrency: {nav.get('hardwareConcurrency', '?')}")
            log_entry.append(f"  Device Memory: {nav.get('deviceMemory', '?')} GB")
            log_entry.append(f"  Platform: {nav.get('platform', '?')}")
        
        # Ядра и L3
        log_entry.append(f"\n🖥️  CPU CORES: {data.get('coreCount', '?')}")
        log_entry.append(f"🎯 ESTIMATED L3 SIZE: {data.get('estimatedL3SizeKB', '?')} KB")
        
        # Сырые данные
        if 'sizes' in data and 'latencies' in data:
            log_entry.append("\n⏱️  RAW TIMING DATA:")
            log_entry.append(f"  {'Size (KB)':<15} {'Latency (ms)':<20} {'Status'}")
            log_entry.append(f"  {'-'*15} {'-'*20} {'-'*10}")
            
            for size, lat in zip(data['sizes'], data['latencies']):
                status = "✓" if lat and lat > 0 else "✗"
                lat_str = f"{lat:.6f}" if lat else "NULL"
                log_entry.append(f"  {size:<15} {lat_str:<20} {status}")
        
        # Анализ
        if 'cacheAnalysis' in data:
            analysis = data['cacheAnalysis']
            log_entry.append("\n📊 CACHE ANALYSIS:")
            if analysis.get('topJump'):
                jump = analysis['topJump']
                log_entry.append(f"  Biggest jump at: {jump.get('size', '?')} KB")
                log_entry.append(f"  Absolute growth: {jump.get('absJump', '?')} ms")
                log_entry.append(f"  Relative growth: {jump.get('relJump', '?')}")
                log_entry.append(f"  Rounded L3: {jump.get('roundedL3', '?')} KB")
        
        if 'error' in data:
            log_entry.append(f"\n❌ ERROR: {data['error']}")
        
        log_entry.append("\n")
        log_text = "\n".join(log_entry)
        
        with open('test.txt', 'a', encoding='utf-8') as f:
            f.write(log_text)
        
        print(f"[LOG] Data saved to test.txt")
        return jsonify({'status': 'ok', 'message': 'Log saved'})
    
    except Exception as e:
        print(f"[LOG ERROR] {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 L3 CACHE DETECTOR starting...")
    print("🌐 Open: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
