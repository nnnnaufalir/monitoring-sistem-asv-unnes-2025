import requests
import time
import random
import math

SERVER_URL = 'http://127.0.0.1:5000/api/update_data'

# --- STATE MACHINE SIMULATOR ---
STATE = "PREPARATION"
script_start_time = time.time()
race_start_time = None
race_finish_time = None

# --- DATA DUMMY ---
DUMMY_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABvSURBVHja7cEBDQAAAMIg+6deDssgH7TFYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgNwYAAQHYAtsLAAAAAElFTkSuQmCC"
DUMMY_IMAGE_BLUE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABvSURBVHja7cExAQAAAMKg9U/tYwVBERxVYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgPwYAAQGE4gFgAAAAAElFTkSuQmCC"
# --------------------

# Data Kapal
current_x = 12.5
current_y = 2.5
current_heading = 90
current_lat = -7.93000
current_lon = 112.59000
current_sog = 0.0
current_mission_text = "Preparation"
surface_img_data = DUMMY_IMAGE_BASE64
underwater_img_data = DUMMY_IMAGE_BASE64
current_log_status = {
    "preparation": "In Progress",
    "start": "Pending",
    "floating_ball": 0,
    "surface_imaging": "Pending",
    "underwater_imaging": "Pending",
    "finish": "Pending"
}
current_track = "A" # Kita mulai di Lintasan A

print("=== Simulasi Lomba (V-FINAL) Dimulai ===")
print(f"Mengirim data ke: {SERVER_URL}")

def get_payload():
    """Membungkus data saat ini ke dalam payload JSON."""
    global race_start_time, race_finish_time
    
    return {
        "attitude": {
            "sog": round(current_sog, 1),
            "cog": round(current_heading % 360, 1),
            "heading": round((current_heading + random.uniform(-2, 2)) % 360, 1)
        },
        "local_position": {
            "x": round(current_x, 2), 
            "y": round(current_y, 2)
        },
        "gps_location": {
            "lat": round(current_lat, 6),
            "lon": round(current_lon, 6)
        },
        "current_mission": current_mission_text,
        "mission_images": {
            "surface": surface_img_data,
            "underwater": underwater_img_data
        },
        "track_id": current_track,
        "position_log": current_log_status, 
        "race_start_timestamp": race_start_time,
        "race_finish_timestamp": race_finish_time,
        "indicators": {
            "battery": 99 - int((time.time() - script_start_time) / 10) # Baterai turun perlahan
        }
    }

try:
    while True:
        elapsed_time = time.time() - script_start_time
        
        # --- STATE: PREPARATION (0-10 detik) ---
        if elapsed_time < 10:
            STATE = "PREPARATION"
            current_sog = 0.0
            current_x, current_y = 12.5, 2.5 # Diam di Start
            current_mission_text = "Preparation"
            current_log_status["preparation"] = "In Progress"
            
        # --- STATE: START & FLOATING BALLS (10-40 detik) ---
        elif elapsed_time < 40:
            if STATE == "PREPARATION": # Transisi
                print("***** SIMULASI: MEMULAI LOMBA *****")
                race_start_time = time.time() # TIMER DIMULAI!
                current_log_status["preparation"] = "Done"
                current_log_status["start"] = "Done"
            
            STATE = "FLOATING_BALLS"
            current_mission_text = "Menyusuri Bola Apung"
            current_log_status["floating_ball"] = min(10, int((elapsed_time - 10) / 3)) # 1 bola setiap 3 detik
            
            # Gerak melingkar dummy
            current_sog = 3.0
            current_heading += 6 # Belok perlahan
            rad = math.radians(current_heading)
            current_x += math.cos(rad) * current_sog * 0.2
            current_y += math.sin(rad) * current_sog * 0.2
            
        # --- STATE: SURFACE IMAGING (40-50 detik) ---
        elif elapsed_time < 50:
            if STATE == "FLOATING_BALLS": # Transisi
                print("***** SIMULASI: MISI SURFACE *****")
                current_log_status["floating_ball"] = 10 # Anggap selesai
            
            STATE = "SURFACE_IMAGING"
            current_mission_text = "Mencari Kotak Surface"
            current_log_status["surface_imaging"] = "In Progress"
            surface_img_data = DUMMY_IMAGE_BLUE_BASE64 # Kirim gambar
            current_sog = 1.0 # Melambat untuk mencari
            
        # --- STATE: UNDERWATER IMAGING (50-60 detik) ---
        elif elapsed_time < 60:
            if STATE == "SURFACE_IMAGING": # Transisi
                print("***** SIMULASI: MISI UNDERWATER *****")
                current_log_status["surface_imaging"] = "Done"
            
            STATE = "UNDERWATER_IMAGING"
            current_mission_text = "Mencari Kotak Underwater"
            current_log_status["underwater_imaging"] = "In Progress"
            underwater_img_data = DUMMY_IMAGE_BLUE_BASE64 # Kirim gambar
            current_sog = 1.0 # Masih melambat
            
        # --- STATE: RACE TO FINISH (60-65 detik) ---
        elif elapsed_time < 65:
            if STATE == "UNDERWATER_IMAGING": # Transisi
                print("***** SIMULASI: KEMBALI KE FINISH *****")
                current_log_status["underwater_imaging"] = "Done"
            
            STATE = "RACE_TO_FINISH"
            current_mission_text = "Kembali ke Finish"
            current_log_status["finish"] = "In Progress"
            current_sog = 4.0 # Ngebut ke finish
            # Pura-pura bergerak lurus ke finish
            current_x, current_y = 12.5, 2.5
            
        # --- STATE: FINISHED (65+ detik) ---
        else:
            if STATE == "RACE_TO_FINISH": # Transisi
                print("***** SIMULASI: LOMBA SELESAI *****")
                race_finish_time = time.time() # TIMER BERHENTI!
                current_log_status["finish"] = "Done"
            
            STATE = "FINISHED"
            current_mission_text = "Lomba Selesai"
            current_sog = 0.0 # Berhenti
            
        
        # --- Kirim data ke server ---
        payload = get_payload()
        try:
            response = requests.post(SERVER_URL, json=payload)
            if response.status_code == 200:
                print(f"[{time.ctime()}] State: {STATE}, Misi: {current_mission_text}")
            else:
                print(f"Gagal mengirim data. Status: {response.status_code}")
        
        except requests.exceptions.ConnectionError:
            print(f"[{time.ctime()}] Gagal terhubung ke server.")

        time.sleep(1) # Kita percepat simulasi jadi 1 detik agar lebih 'real-time'

except KeyboardInterrupt:
    print("\n=== Simulasi Kapal Dihentikan ===")