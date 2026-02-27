const API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

let map;
let baseLight;
let baseDark;
let trafficLayer;
let currentLat = null;
let currentLon = null;

// 🌙 Tryb ciemny
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    updateMapStyle();
};

// 🔍 Google Search
function searchGoogle() {
    const q = document.getElementById("searchInput").value;
    if (q.trim()) window.open("https://www.google.com/search?q=" + encodeURIComponent(q));
}

// 🌤 Pogoda
function loadWeather(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pl`)
        .then(r => r.json())
        .then(d => {
            document.getElementById("weather").innerHTML = `
                <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" style="width:40px; vertical-align:middle;">
                <strong>${Math.round(d.main.temp)}°C</strong> – ${d.weather[0].description}
            `;
        })
        .catch(() => {
            document.getElementById("weather").textContent = "Nie udało się pobrać pogody.";
        });
}

// 🗺️ Mapa
function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 12);

    baseLight = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png");
    baseDark = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png");
    trafficLayer = L.tileLayer("https://{s}.tile.opentrafficmap.xyz/{z}/{x}/{y}.png", { opacity: 0.6 });

    if (document.body.classList.contains("dark")) baseDark.addTo(map);
    else baseLight.addTo(map);

    trafficLayer.addTo(map);

    L.marker([lat, lon]).addTo(map).bindPopup("Tu jesteś").openPopup();
}

function updateMapStyle() {
    if (!map) return;
    if (map.hasLayer(baseLight)) map.removeLayer(baseLight);
    if (map.hasLayer(baseDark)) map.removeLayer(baseDark);
    if (document.body.classList.contains("dark")) baseDark.addTo(map);
    else baseLight.addTo(map);
}

// 🧭 Nawigacja
function renderNavControls(user) {
    const container = document.getElementById("navControls");
    let html = "";

    if (user.home) html += `<button class="edit-btn" onclick="openGoogleMaps('${user.home}')">Dom 🏠</button>`;
    if (user.work) html += `<button class="edit-btn" onclick="openGoogleMaps('${user.work}')">Praca 💼</button>`;
    if (user.fav1) html += `<button class="edit-btn" onclick="openGoogleMaps('${user.fav1}')">Miejsce 1 ⭐</button>`;
    if (user.fav2) html += `<button class="edit-btn" onclick="openGoogleMaps('${user.fav2}')">Miejsce 2 ⭐</button>`;

    html += `
        <input id="navTarget" type="text" placeholder="Dokąd chcesz jechać?">
        <button class="edit-btn" onclick="navigateCustom()">Nawiguj z mojej lokalizacji 🚗</button>
    `;

    container.innerHTML = html;
}

function openGoogleMaps(dest) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`);
}

function navigateCustom() {
    const dest = document.getElementById("navTarget").value.trim();
    if (!dest) return alert("Podaj cel podróży.");
    openGoogleMaps(dest);
}

// 🟦 ONBOARDING MIEJSC
function showOnboarding() {
    const modal = document.getElementById("onboardingModal");
    modal.style.display = "flex";
}

function saveUserData() {
    const user = {
        home: homeAddress.value.trim(),
        work: workAddress.value.trim(),
        fav1: fav1.value.trim(),
        fav2: fav2.value.trim()
    };

    localStorage.setItem("neskyUser", JSON.stringify(user));
    document.getElementById("onboardingModal").style.display = "none";
    renderNavControls(user);
}

document.getElementById("saveUserData").onclick = saveUserData;
document.getElementById("editPlaces").onclick = showOnboarding;

function checkUserData() {
    const data = localStorage.getItem("neskyUser");

    if (!data || data === "{}" || data === "null") {
        showOnboarding();
        return;
    }

    const user = JSON.parse(data);
    renderNavControls(user);
}

// 🟡 WYDARZENIA LOKALNE — ETAP 1

function loadLocalEvents() {
    const data = localStorage.getItem("neskyEvents");
    return data ? JSON.parse(data) : [];
}

function saveLocalEvents(events) {
    localStorage.setItem("neskyEvents", JSON.stringify(events));
}

function renderEvents() {
    const container = document.getElementById("eventsList");
    const events = loadLocalEvents();

    if (!events.length) {
        container.innerHTML = "<p>Brak wydarzeń.</p>";
        return;
    }

    events.sort((a, b) => {
        const da = new Date(a.date + " " + a.time);
        const db = new Date(b.date + " " + b.time);
        return da - db;
    });

    container.innerHTML = events.map(evt => `
        <div class="event-item">
            🟡 <strong>${evt.time}</strong> – ${evt.title} <br>
            <small>${evt.date}</small>
        </div>
    `).join("");
}

function openEventModal() {
    document.getElementById("eventModal").style.display = "flex";
}

function closeEventModal() {
    document.getElementById("eventModal").style.display = "none";
}

function saveEvent() {
    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;

    if (!title || !date || !time) {
        alert("Wypełnij wszystkie pola.");
        return;
    }

    const events = loadLocalEvents();

    events.push({
        id: "evt_" + Date.now(),
        title,
        date,
        time,
        source: "local"
    });

    saveLocalEvents(events);
    closeEventModal();
    renderEvents();

    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
}

// Podpięcie przycisków wydarzeń
document.getElementById("addEventBtn").onclick = openEventModal;
document.getElementById("saveEventBtn").onclick = saveEvent;

// Zamknięcie modala wydarzeń po kliknięciu w tło (opcjonalnie)
document.getElementById("eventModal").addEventListener("click", (e) => {
    if (e.target.id === "eventModal") closeEventModal();
});

// 📍 Start
navigator.geolocation.getCurrentPosition(
    pos => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;

        loadWeather(currentLat, currentLon);
        initMap(currentLat, currentLon);
        checkUserData();
        renderEvents();
    },
    () => {
        document.getElementById("weather").textContent = "Brak dostępu do lokalizacji.";
        document.getElementById("map").textContent = "Mapa niedostępna.";
        checkUserData();
        renderEvents();
    }
);
