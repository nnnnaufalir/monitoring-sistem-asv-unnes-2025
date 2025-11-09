from flask import Flask, request, jsonify, render_template
import time

# 1. Inisialisasi server Flask
app = Flask(__name__)

# 2. "Database" sementara kita (hanya variabel global)
# PERBARUI: Tambahkan 'heading' dan 'timestamp'
latest_ship_data = {
    "position_log": {
        "preparation": "Done",
        "start": "Pending",
        "floating_ball": 0,
        "surface_imaging": "Pending",
        "underwater_imaging": "Pending",
        "finish": "Pending"
    },
    "attitude": {
        "sog": 0.0,
        "cog": 0.0,
        "heading": 0.0  # <-- TAMBAHAN BARU
    },
    "local_position": {
        "x": 12.5,
        "y": 2.5
    },
    "gps_location": {
        "lat": -7.93000,
        "lon": 112.59000
    },
    "current_mission": "Inisialisasi",
    "mission_images": {
        "surface": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "underwater": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    },
    "track_id": "A",
    
    # --- TAMBAHAN BARU (Request #1) ---
    "race_start_timestamp": None, # Akan diisi oleh simulator
    "race_finish_timestamp": None, # Akan diisi oleh simulator
    # -----------------------------------
    
    "indicators": {
        "battery": 100,
        "last_update": time.time()
    }
}

# --- HALAMAN UNTUK PANITIA ---
@app.route('/')
def dashboard():
    return render_template('index.html')

# --- API UNTUK KOMUNIKASI ---
@app.route('/api/get_data', methods=['GET'])
def get_data():
    return jsonify(latest_ship_data)

@app.route('/api/update_data', methods=['POST'])
def update_data():
    global latest_ship_data
    
    data_from_ship = request.json
    latest_ship_data.update(data_from_ship)
    latest_ship_data['indicators']['last_update'] = time.time()
    
    # Ambil timestamp dari kapal jika ada
    if "race_start_timestamp" in data_from_ship:
        latest_ship_data['race_start_timestamp'] = data_from_ship['race_start_timestamp']
    if "race_finish_timestamp" in data_from_ship:
        latest_ship_data['race_finish_timestamp'] = data_from_ship['race_finish_timestamp']
    
    return jsonify({"status": "success", "message": "Data updated"})

# --- Menjalankan Server ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)