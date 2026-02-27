// --- KONFIGURACJA ---

const API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

// Twój Client ID z Google Cloud
const GOOGLE_CLIENT_ID = "59559337506-iul40kn2gsjschbkdl92jabsp4slfjaa.apps.googleusercontent.com";

// Pełny dostęp do kalendarza
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar";

let map;
let baseLight;
let baseDark;
let trafficLayer;
let currentLat = null;
let currentLon = null;

// Google OAuth (GIS)
let googleTokenClient = null;
let googleAccessToken = null;
let googleEventsCache = [];

// --- TRYB CIEMNY ---

document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
    updateMapStyle();
};

// --- GOOGLE SEARCH ---

function searchGoogle() {
    const q = document.getElementById("searchInput").value;
    if (q.trim()) window.open("https://www.google.com/search?q=" + encodeURIComponent(q));
}

// --- POGODA ---

function loadWeather(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pl`)
        .then(r => r.json())
        .then(d => {
            if (!d || !d.weather || !d.weather[0]) {
                document.getElementById("weather").textContent = "Nie udało się pobrać pogody.";
                return;
            }
            document.getElementById("weather").innerHTML = `
                <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" style="width:40px; vertical-align:middle;">
                <strong>${Math.round(d.main.temp)}°C</strong> – ${d.weather[0].description}
            `;
        })
        .catch(() => {
            document.getElementById("weather").textContent = "Nie udało się pobrać pogody.";
        });
}

// --- MAPA ---

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

// --- NAWIGACJA ---

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

// --- ONBOARDING MIEJSC ---

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

// --- WYDARZENIA LOKALNE ---

function loadLocalEvents() {
    const data = localStorage.getItem("neskyEvents");
    return data ? JSON.parse(data) : [];
}

function saveLocalEvents(events) {
    localStorage.setItem("neskyEvents", JSON.stringify(events));
}

// --- GOOGLE OAUTH (GIS) ---

function initGoogleOAuth() {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        // skrypt GIS jeszcze się nie załadował – spróbujemy później
        setTimeout(initGoogleOAuth, 500);
        return;
    }

    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                googleAccessToken = tokenResponse.access_token;
                localStorage.setItem("neskyGoogleAccessToken", googleAccessToken);
                fetchGoogleEvents();
            }
        }
    });

    // jeśli mamy token z poprzedniej sesji – spróbujmy go użyć
    const storedToken = localStorage.getItem("neskyGoogleAccessToken");
    if (storedToken) {
        googleAccessToken = storedToken;
        fetchGoogleEvents(); // spróbuj od razu pobrać wydarzenia
    }
}

function connectGoogleCalendar() {
    if (!googleTokenClient) {
        alert("Logowanie Google jeszcze nie jest gotowe. Spróbuj za chwilę.");
        return;
    }

    googleTokenClient.requestAccessToken({ prompt: "consent" });
}

// --- POBIERANIE WYDARZEŃ Z GOOGLE CALENDAR ---

async function fetchGoogleEvents() {
    if (!googleAccessToken) {
        return;
    }

    try {
        const now = new Date().toISOString();

        const res = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
            new URLSearchParams({
                timeMin: now,
                singleEvents: "true",
                orderBy: "startTime",
                maxResults: "20"
            }),
            {
                headers: {
                    Authorization: "Bearer " + googleAccessToken
                }
            }
        );

        if (!res.ok) {
            // token mógł wygasnąć – wyczyść i nie blokuj aplikacji
            if (res.status === 401 || res.status === 403) {
                googleAccessToken = null;
                localStorage.removeItem("neskyGoogleAccessToken");
            }
            return;
        }

        const data = await res.json();
        const items = data.items || [];

        googleEventsCache = items
            .filter(evt => evt.start && (evt.start.dateTime || evt.start.date))
            .map(evt => {
                const start = evt.start.dateTime || (evt.start.date + "T00:00:00");
                const dt = new Date(start);

                const date = dt.toISOString().slice(0, 10);
                const time = dt.toTimeString().slice(0, 5);

                return {
                    id: evt.id,
                    title: evt.summary || "(bez tytułu)",
                    date,
                    time,
                    source: "google"
                };
            });

        renderEvents();
    } catch (e) {
        console.error("Błąd pobierania wydarzeń Google:", e);
    }
}

// --- DODAWANIE WYDARZENIA DO GOOGLE CALENDAR ---

async function saveEventToGoogleCalendar(title, date, time) {
    if (!googleAccessToken) {
        // jeśli nie ma tokena – spróbuj zalogować i dopiero potem zapisz
        connectGoogleCalendar();
        alert("Najpierw połącz z Google Calendar, potem spróbuj ponownie.");
        return;
    }

    try {
        // Europe/Berlin – stała strefa
        const startLocal = new Date(`${date}T${time}:00`);
        const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000); // +1h

        const startISO = startLocal.toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T");
        const endISO = endLocal.toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T");

        const body = {
            summary: title,
            start: {
                dateTime: startISO,
                timeZone: "Europe/Berlin"
            },
            end: {
                dateTime: endISO,
                timeZone: "Europe/Berlin"
            }
        };

        const res = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + googleAccessToken
                },
                body: JSON.stringify(body)
            }
        );

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                googleAccessToken = null;
                localStorage.removeItem("neskyGoogleAccessToken");
                alert("Sesja Google wygasła. Połącz ponownie.");
            } else {
                alert("Nie udało się zapisać wydarzenia w Google Calendar.");
            }
            return;
        }

        // po udanym zapisie – odśwież listę wydarzeń Google
        await fetchGoogleEvents();
    } catch (e) {
        console.error("Błąd zapisu wydarzenia do Google:", e);
        alert("Wystąpił błąd podczas zapisu do Google Calendar.");
    }
}

// --- RENDEROWANIE WYDARZEŃ (LOKALNE + GOOGLE) ---

function renderEvents() {
    const container = document.getElementById("eventsList");
    const localEvents = loadLocalEvents();

    const allEvents = [
        ...localEvents.map(e => ({ ...e, source: "local" })),
        ...googleEventsCache
    ];

    if (!allEvents.length) {
        container.innerHTML = "<p>Brak wydarzeń.</p>";
        return;
    }

    allEvents.sort((a, b) => {
        const da = new Date(a.date + " " + a.time);
        const db = new Date(b.date + " " + b.time);
        return da - db;
    });

    container.innerHTML = allEvents.map(evt => {
        const icon = evt.source === "google" ? "🔵" : "🟡";
        const sourceLabel = evt.source === "google" ? "Google Calendar" : "Lokalne";

        return `
            <div class="event-item">
                <div>
                    ${icon} <strong>${evt.time}</strong> – ${evt.title}
                </div>
                <div class="event-meta">
                    ${evt.date} · ${sourceLabel}
                </div>
            </div>
        `;
    }).join("");
}

// --- MODAL WYDARZENIA ---

function openEventModal() {
    document.getElementById("eventModal").style.display = "flex";
}

function closeEventModal() {
    document.getElementById("eventModal").style.display = "none";
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
}

function validateEventForm() {
    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;

    if (!title || !date || !time) {
        alert("Wypełnij wszystkie pola.");
        return null;
    }

    return { title, date, time };
}

function saveEventLocal() {
    const data = validateEventForm();
    if (!data) return;

    const events = loadLocalEvents();

    events.push({
        id: "evt_" + Date.now(),
        title: data.title,
        date: data.date,
        time: data.time,
        source: "local"
    });

    saveLocalEvents(events);
    closeEventModal();
    renderEvents();
}

function saveEventGoogle() {
    const data = validateEventForm();
    if (!data) return;

    saveEventToGoogleCalendar(data.title, data.date, data.time);
    closeEventModal();
}

// Podpięcie przycisków wydarzeń
document.getElementById("addEventBtn").onclick = openEventModal;
document.getElementById("saveEventLocalBtn").onclick = saveEventLocal;
document.getElementById("saveEventGoogleBtn").onclick = saveEventGoogle;

// Zamknięcie modala wydarzeń po kliknięciu w tło
document.getElementById("eventModal").addEventListener("click", (e) => {
    if (e.target.id === "eventModal") closeEventModal();
});

// Przycisk „Połącz z Google Calendar”
document.getElementById("googleConnectBtn").onclick = connectGoogleCalendar;

// --- START APLIKACJI ---

navigator.geolocation.getCurrentPosition(
    pos => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;

        loadWeather(currentLat, currentLon);
        initMap(currentLat, currentLon);
        checkUserData();
        renderEvents();
        initGoogleOAuth();
    },
    () => {
        document.getElementById("weather").textContent = "Brak dostępu do lokalizacji.";
        document.getElementById("map").textContent = "Mapa niedostępna.";
        checkUserData();
        renderEvents();
        initGoogleOAuth();
    }
); 
