// --- Variabel Global ---
let map;
let shipMarker;
const arenaImagePathA = "static/arena-a.png";
const arenaImagePathB = "static/arena-b.png";
let arenaOverlay;
let shipTrack = [];
let shipTrackLine;
let currentTrack = "A";
const arenaWidth = 25;
const bounds = [
  [0, 0],
  [25, 25],
];
const initialCoords = [12.5, 12.5];

let raceTimerInterval = null;
let lastUpdateTimestamp = null;

// 1. Fungsi Inisialisasi Peta
function initMap() {
  map = L.map("map", {
    crs: L.CRS.Simple,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    zoomControl: false,
    attributionControl: false,
  });

  arenaOverlay = L.imageOverlay(arenaImagePathA, bounds).addTo(map);

  const shipIcon = L.icon({
    iconUrl: "static/ship-icon.png",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  // --- (PERBAIKAN BUG) GANTI L.rotatedMarker MENJADI L.marker ---
  // Plugin ini 'memodifikasi' L.marker, bukan 'membuat' L.rotatedMarker
  shipMarker = L.marker(initialCoords, {
    icon: shipIcon,
    rotationAngle: 0, // Pindahkan 'rotationAngle' ke dalam opsi
  })
    .addTo(map)
    .bindPopup("<b>Posisi Kapal</b><br>Data awal.");
  // --- AKHIR PERBAIKAN BUG ---

  shipTrackLine = L.polyline(shipTrack, {
    color: "#007bff",
    weight: 3,
  }).addTo(map);

  map.fitBounds(bounds);

  map.once("load zoomend", function () {
    const zoomLevel = map.getZoom();
    map.setMinZoom(zoomLevel);
    map.setMaxZoom(zoomLevel);
  });
}

// --- FUNGSI BARU (Request #1 & #2) ---
function formatRaceTime(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCardinalDirection(degree) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degree / 45) % 8;
  return directions[index];
}
// ------------------------------------

// 2. Fungsi utama untuk mengambil & memperbarui data
async function fetchData() {
  try {
    const response = await fetch("/api/get_data");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    // --- LOGIKA "SMART TRACK" ---
    const trackFromShip = data.track_id;
    const mapContainerElement = map.getContainer();
    const trackBadge = document.getElementById("track-status-badge");
    if (trackFromShip !== currentTrack) {
      currentTrack = trackFromShip;
    }
    if (currentTrack === "B") {
      if (arenaOverlay) arenaOverlay.setUrl(arenaImagePathB);
      if (mapContainerElement) mapContainerElement.classList.add("track-b-active");
      if (trackBadge) {
        trackBadge.innerText = "Lintasan B";
        trackBadge.classList.remove("bg-danger");
        trackBadge.classList.add("bg-success");
      }
    } else {
      if (arenaOverlay) arenaOverlay.setUrl(arenaImagePathA);
      if (mapContainerElement) mapContainerElement.classList.remove("track-b-active");
      if (trackBadge) {
        trackBadge.innerText = "Lintasan A";
        trackBadge.classList.remove("bg-success");
        trackBadge.classList.add("bg-danger");
      }
    }

    // --- Update Attitude (SOG + SOG_KMH) ---
    const sog_knots = data.attitude.sog.toFixed(1);
    const sog_kmh = (data.attitude.sog * 1.852).toFixed(1);
    const cog_value = data.attitude.cog.toFixed(1);
    const heading_value = data.attitude.heading.toFixed(1);

    const sogElement = document.getElementById("sog");
    const cogElement = document.getElementById("cog");
    const headingElement = document.getElementById("heading");

    sogElement.innerText = sog_knots;
    document.getElementById("sog-kmh").innerText = sog_kmh;
    cogElement.innerText = cog_value;
    headingElement.innerText = heading_value;

    document.getElementById("cog-cardinal").innerText = `(${getCardinalDirection(cog_value)})`;
    document.getElementById("heading-cardinal").innerText = `(${getCardinalDirection(heading_value)})`;

    if (sog_knots > 0.1) {
      sogElement.classList.add("text-primary");
      sogElement.classList.remove("text-muted");
      cogElement.classList.add("text-danger");
      cogElement.classList.remove("text-muted");
      headingElement.classList.add("text-danger");
      headingElement.classList.remove("text-muted");
    } else {
      sogElement.classList.remove("text-primary");
      sogElement.classList.add("text-muted");
      cogElement.classList.remove("text-danger");
      cogElement.classList.add("text-muted");
      headingElement.classList.remove("text-danger");
      headingElement.classList.add("text-muted");
    }

    // --- Update Trajectory ---
    let pos = data.local_position;
    let displayX = pos.x;
    if (currentTrack === "B") {
      displayX = arenaWidth - pos.x;
    }
    const newLatLng = [pos.y, displayX];
    const newPositionLabel = `X: ${displayX.toFixed(2)}, Y: ${pos.y.toFixed(2)}`;
    document.getElementById("position-label").innerText = newPositionLabel;

    shipMarker.setLatLng(newLatLng);

    // Perbarui sudut rotasi (ini sudah benar)
    shipMarker.setRotationAngle(heading_value);

    shipMarker.setPopupContent(`
            <b>Posisi Kapal</b><br>
            X: ${displayX.toFixed(2)}m<br>
            Y: ${pos.y.toFixed(2)}m<br>
            SOG: ${sog_knots} knots
        `);
    shipTrack.push(newLatLng);
    shipTrackLine.setLatLngs(shipTrack);

    // --- Update Kolom Kiri ---
    document.getElementById("gps-lat").innerText = data.gps_location.lat.toFixed(6);
    document.getElementById("gps-lon").innerText = data.gps_location.lon.toFixed(6);
    document.getElementById("current-mission-text").innerText = data.current_mission;

    const gridCols = ["E", "D", "C", "B", "A"];
    const gridRows = ["1", "2", "3", "4", "5"];
    const x_index = Math.floor(displayX / 5);
    const y_index = Math.floor(pos.y / 5);
    const colLabel = gridCols[Math.min(Math.max(x_index, 0), 4)];
    const rowLabel = gridRows[Math.min(Math.max(y_index, 0), 4)];
    document.getElementById("trajectory-grid-text").innerText = colLabel + rowLabel;

    // --- Update Kolom Kanan (Gambar) ---
    document.getElementById("surface-image").src = data.mission_images.surface;
    document.getElementById("underwater-image").src = data.mission_images.underwater;

    // --- Update Kolom Tengah (Mission Log) ---
    const list1 = document.getElementById("status-list-1");
    const list2 = document.getElementById("status-list-2");
    const log = data.position_log;

    function getStatusBadge(status) {
      if (status === "Done") return `<span class="badge bg-success rounded-pill">Done</span>`;
      if (status === "In Progress") return `<span class="badge bg-primary rounded-pill">In Progress</span>`;
      return `<span class="badge bg-secondary rounded-pill">Pending</span>`;
    }

    list1.innerHTML = `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Preparation
                ${getStatusBadge(log.preparation)}
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Start
                ${getStatusBadge(log.start)}
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Floating Balls
                <span class="badge bg-primary rounded-pill">${log.floating_ball} / 10</span>
            </li>
        `;

    list2.innerHTML = `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Surface Imaging
                ${getStatusBadge(log.surface_imaging)}
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Underwater Imaging
                ${getStatusBadge(log.underwater_imaging)}
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                Finish
                ${getStatusBadge(log.finish)}
            </li>
        `;

    // --- Update Indikator (Baterai) ---
    const batteryBar = document.getElementById("battery-bar");
    const batteryText = document.getElementById("battery");
    const batteryPercentage = data.indicators.battery;

    batteryText.innerText = `${batteryPercentage}%`;
    batteryBar.style.width = `${batteryPercentage}%`;
    batteryBar.setAttribute("aria-valuenow", batteryPercentage);

    if (batteryPercentage > 50) {
      batteryBar.classList.remove("bg-warning", "bg-danger");
      batteryBar.classList.add("bg-success");
    } else if (batteryPercentage > 20) {
      batteryBar.classList.remove("bg-success", "bg-danger");
      batteryBar.classList.add("bg-warning");
    } else {
      batteryBar.classList.remove("bg-success", "bg-warning");
      batteryBar.classList.add("danger");
    }

    // --- LOGIKA WAKTU LOMBA ---
    const raceTimerEl = document.getElementById("race-timer");
    if (data.race_finish_timestamp) {
      if (raceTimerInterval) clearInterval(raceTimerInterval);
      raceTimerInterval = null;
      const finalTime = data.race_finish_timestamp - data.race_start_timestamp;
      raceTimerEl.innerText = formatRaceTime(finalTime) + " (Final)";
      raceTimerEl.classList.remove("text-primary");
      raceTimerEl.classList.add("text-success");
    } else if (data.race_start_timestamp && !raceTimerInterval) {
      const startTime = data.race_start_timestamp;
      raceTimerEl.innerText = formatRaceTime(0);
      raceTimerInterval = setInterval(() => {
        const elapsedSeconds = Date.now() / 1000 - startTime;
        raceTimerEl.innerText = formatRaceTime(elapsedSeconds);
      }, 1000);
    } else if (!data.race_start_timestamp) {
      raceTimerEl.innerText = "00:00";
      raceTimerEl.classList.add("text-primary");
      raceTimerEl.classList.remove("text-success");
    }

    // --- LOGIKA STATUS KONEKSI ---
    const statusBadge = document.getElementById("connection-status");
    lastUpdateTimestamp = data.indicators.last_update;

    const lastUpdateDate = new Date(lastUpdateTimestamp * 1000);
    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
      hour12: false,
    };
    document.getElementById("last-update").innerText = "Data Terakhir: " + lastUpdateDate.toLocaleTimeString("id-ID", timeOptions) + " WIB";

    const browserTimestamp = Date.now() / 1000;
    const dataAgeInSeconds = browserTimestamp - lastUpdateTimestamp;
    if (dataAgeInSeconds > 15) {
      statusBadge.classList.remove("bg-success");
      statusBadge.classList.add("bg-danger");
      statusBadge.innerText = "OFFLINE";
    } else {
      statusBadge.classList.remove("bg-danger");
      statusBadge.classList.add("bg-success");
      statusBadge.innerText = "ONLINE";
    }
  } catch (error) {
    console.error("Error fetching data:", error);

    document.getElementById("last-update").innerText = "Connection Error";

    const statusBadge = document.getElementById("connection-status");
    if (statusBadge) {
      statusBadge.classList.remove("bg-success");
      statusBadge.classList.add("bg-danger");
      statusBadge.innerText = "OFFLINE";
    }
  }
} // --- AKHIR FUNGSI fetchData ---

// --- FUNGSI JAM DIGITAL ---
function updateClock() {
  function pad(n) {
    return n < 10 ? "0" + n : n;
  }
  const now = new Date();
  const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
  const dateString = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const clockEl = document.getElementById("live-clock");
  const dateEl = document.getElementById("live-date");
  if (clockEl) clockEl.innerText = timeString;
  if (dateEl) dateEl.innerText = dateString;

  const statusBadge = document.getElementById("connection-status");
  if (lastUpdateTimestamp && statusBadge.innerText === "ONLINE") {
    const browserTimestamp = Date.now() / 1000;
    const dataAgeInSeconds = browserTimestamp - lastUpdateTimestamp;
    if (dataAgeInSeconds > 15) {
      statusBadge.classList.remove("bg-success");
      statusBadge.classList.add("bg-danger");
      statusBadge.innerText = "OFFLINE";
    }
  }
}

// --- Inisialisasi Aplikasi ---
// (Wrapper 'window.load' atau 'DOMContentLoaded' tidak diperlukan
//  jika <script> kita diletakkan di akhir <body> di HTML)
//  Namun, kita akan tetap menggunakan urutan <script> yang benar di HTML.

// --- Inisialisasi Peta ---
initMap();

// --- Jalankan Jam Digital (Setiap 1 detik) ---
setInterval(updateClock, 1000);

// --- Jalankan Polling Data (Setiap 1 detik) ---
fetchData();
setInterval(fetchData, 1000);
