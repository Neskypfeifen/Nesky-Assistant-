// 🔧 Pogoda
const API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

// 🌙 Tryb jasny/ciemny
document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    document.getElementById("themeToggle").textContent =
        document.body.classList.contains("dark") ? "☀️" : "🌙";

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
                <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png">
                <strong>${Math.round(d.main.temp)}°C</strong> – ${d.weather[0].description}
            `;
        });
}

// 🗺️ Leaflet mapa
let map;
let tileLayer;
let trafficLayer;
let routingControl;

function loadMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 13);

    tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);

    trafficLayer = L.tileLayer("https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        opacity: 0.6
    }).addTo(map);

    L.marker([lat, lon]).addTo(map).bindPopup("Tu jesteś").openPopup();
}

function updateMapStyle() {
    if (!map) return;

    map.removeLayer(tileLayer);

    if (document.body.classList.contains("dark")) {
        tileLayer = L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png");
    } else {
        tileLayer = L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png");
    }

    tileLayer.addTo(map);
}

// 🧭 Nawigacja
function renderNavControls(user) {
    const container = document.getElementById("navControls");

    const places = [];
    if (user.home) places.push({ label: "Dom 🏠", value: user.home });
    if (user.work) places.push({ label: "Praca 💼", value: user.work });
    if (user.fav1) places.push({ label: "Miejsce 1 ⭐", value: user.fav1 });
    if (user.fav2) places.push({ label: "Miejsce 2 ⭐", value: user.fav2 });

    let html = "";

    if (places.length) {
        html += `<p>Szybka nawigacja:</p><div style="display:flex; flex-wrap:wrap; gap:6px;">`;
        for (const p of places) {
            html += `
                <button class="nav-btn" data-target="${p.value}">
                    ${p.label}
                </button>
            `;
        }
        html += `</div>`;
    }

    html += `
        <div style="margin-top:10px;">
            <input id="navTarget" type="text" placeholder="Dokąd chcesz jechać?">
            <button id="startNav">Nawiguj 🚗</button>
        </div>
    `;

    container.innerHTML = html;

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.onclick = () => startRouting(btn.dataset.target);
    });

    document.getElementById("startNav").onclick = () => {
        const target = document.getElementById("navTarget").value.trim();
        if (!target) return alert("Podaj cel podróży.");
        startRouting(target);
    };
}

function startRouting(address) {
    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(currentLat, currentLon),
            L.latLng(0, 0)
        ],
        router: L.Routing.osrmv1({
            serviceUrl: "https://router.project-osrm.org/route/v1"
        }),
        geocoder: L.Control.Geocoder.nominatim(),
        routeWhileDragging: false
    }).addTo(map);

    routingControl.spliceWaypoints(1, 1, address);
}

// 🔵 Onboarding
function showOnboarding() {
    const modal = document.getElementById("onboardingModal");
    modal.style.display = "flex";

    document.getElementById("saveUserData").onclick = () => {
        const user = {
            home: homeAddress.value.trim(),
            work: workAddress.value.trim(),
            fav1: fav1.value.trim(),
            fav2: fav2.value.trim()
        };
        localStorage.setItem("neskyUser", JSON.stringify(user));
        modal.style.display = "none";
        renderNavControls(user);
    };
}

function checkUserData() {
    const data = localStorage.getItem("neskyUser");
    if (!data) showOnboarding();
    else renderNavControls(JSON.parse(data));
}

// 📍 Start
let currentLat = 0;
let currentLon = 0;

navigator.geolocation.getCurrentPosition(
    pos => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;

        loadWeather(currentLat, currentLon);
        loadMap(currentLat, currentLon);
        checkUserData();
    },
    () => {
        document.getElementById("weather").textContent = "Brak dostępu do lokalizacji.";
        document.getElementById("map").textContent = "Mapa niedostępna.";
        checkUserData();
    }
); 
