// 🔧 Klucz API pogody
const API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

let map;
let baseLight;
let baseDark;
let trafficLayer;
let currentLat = null;
let currentLon = null;

// 🌙 Tryb jasny/ciemny
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    updateMapStyle();
});

// 🔍 Wyszukiwanie Google
function searchGoogle() {
    const q = document.getElementById("searchInput").value;
    if (q.trim()) {
        window.open("https://www.google.com/search?q=" + encodeURIComponent(q));
    }
}

// 🌤 Pogoda
function loadWeather(lat, lon) {
    const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pl`;

    fetch(url)
        .then(r => r.json())
        .then(d => {
            const temp = Math.round(d.main.temp);
            const desc = d.weather[0].description;
            const icon = d.weather[0].icon;

            document.getElementById("weather").innerHTML = `
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" style="vertical-align:middle; width:40px; height:40px; margin-right:6px;">
                <strong>${temp}°C</strong> – ${desc}
            `;
        })
        .catch(() => {
            document.getElementById("weather").textContent = "Błąd pobierania pogody.";
        });
}

// 🗺️ Mapa Leaflet + ruch drogowy
function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 12);

    baseLight = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    baseDark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    trafficLayer = L.tileLayer(
        "https://{s}.tile.opentrafficmap.xyz/{z}/{x}/{y}.png",
        { opacity: 0.6 }
    );

    if (document.body.classList.contains("dark")) {
        baseDark.addTo(map);
    } else {
        baseLight.addTo(map);
    }

    trafficLayer.addTo(map);

    L.marker([lat, lon]).addTo(map).bindPopup("Tu jesteś").openPopup();
}

function updateMapStyle() {
    if (!map) return;

    if (map.hasLayer(baseLight)) map.removeLayer(baseLight);
    if (map.hasLayer(baseDark)) map.removeLayer(baseDark);

    if (document.body.classList.contains("dark")) {
        baseDark.addTo(map);
    } else {
        baseLight.addTo(map);
    }
}

// 🧭 Nawigacja – zapisane miejsca + dowolny cel
function renderNavControls(user) {
    const container = document.getElementById("navControls");

    const places = [];
    if (user.home) places.push({ label: "Dom 🏠", value: user.home });
    if (user.work) places.push({ label: "Praca 💼", value: user.work });
    if (user.fav1) places.push({ label: "Miejsce 1 ⭐", value: user.fav1 });
    if (user.fav2) places.push({ label: "Miejsce 2 ⭐", value: user.fav2 });

    let html = "";

    if (places.length) {
        html += `<p style="margin-bottom:6px;">Szybka nawigacja:</p><div style="display:flex; flex-wrap:wrap; gap:6px;">`;
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
            <button id="startNav">Nawiguj z mojej lokalizacji 🚗</button>
        </div>
    `;

    container.innerHTML = html;

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.onclick = () => openGoogleMapsDirections(btn.dataset.target);
    });

    document.getElementById("startNav").onclick = () => {
        const target = document.getElementById("navTarget").value.trim();
        if (!target) {
            alert("Podaj cel podróży.");
            return;
        }
        openGoogleMapsDirections(target);
    };
}

// 🔗 Otwieranie nawigacji Google Maps (aktualna lokalizacja → cel)
function openGoogleMapsDirections(destination) {
    const url =
        "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(destination) +
        "&travelmode=driving";
    window.open(url, "_blank");
}

// 🔵 Onboarding
function showOnboarding() {
    const modal = document.getElementById("onboardingModal");
    modal.style.display = "flex";

    document.getElementById("saveUserData").onclick = () => {
        const user = {
            home: document.getElementById("homeAddress").value.trim(),
            work: document.getElementById("workAddress").value.trim(),
            fav1: document.getElementById("fav1").value.trim(),
            fav2: document.getElementById("fav2").value.trim()
        };

        localStorage.setItem("neskyUser", JSON.stringify(user));
        modal.style.display = "none";
        renderNavControls(user);
    };
}

function checkUserData() {
    const data = localStorage.getItem("neskyUser");
    if (!data) {
        showOnboarding();
    } else {
        const user = JSON.parse(data);
        renderNavControls(user);
    }
}

// 📍 Start aplikacji
function initApp() {
    if (!navigator.geolocation) {
        document.getElementById("weather").textContent = "Brak dostępu do lokalizacji.";
        document.getElementById("map").textContent = "Mapa niedostępna.";
        checkUserData();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;

            loadWeather(currentLat, currentLon);
            initMap(currentLat, currentLon);
            checkUserData();
        },
        () => {
            document.getElementById("weather").textContent = "Odmowa dostępu do lokalizacji.";
            document.getElementById("map").textContent = "Mapa niedostępna.";
            checkUserData();
        }
    );
}

initApp(); 
