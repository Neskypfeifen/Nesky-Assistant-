/* ===============================
   KONFIGURACJA
   =============================== */

const OPENWEATHER_API_KEY = "TU_WSTAW_SWÓJ_KLUCZ"; // ← Wstaw swój klucz OpenWeatherMap

const GOOGLE_CLIENT_ID = "59559337506-iul40kn2gsjschbkdl92jabsp4slfjaa.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events";

let googleAccessToken = null;
let googleTokenClient = null;

const LOCAL_STORAGE_PLACES_KEY = "neskyUserPlaces";
const LOCAL_STORAGE_EVENTS_KEY = "neskyLocalEvents";



/* ===============================
   START APLIKACJI
   =============================== */

document.addEventListener("DOMContentLoaded", () => {
    googleAccessToken = localStorage.getItem("neskyGoogleAccessToken") || null;

    initSearch();
    initWeather();
    initMap();
    initPlacesAndOnboarding();
    initNavigation();
    initEventsUI();

    if (googleAccessToken) {
        const btn = document.getElementById("googleConnectBtn");
        if (btn) btn.style.display = "none";
    }
});



/* ===============================
   WYSZUKIWARKA GOOGLE
   =============================== */

function initSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    window.searchGoogle = function () {
        const q = input.value.trim();
        if (!q) return;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
    };
}



/* ===============================
   POGODA — ROZBUDOWANA
   =============================== */

function initWeather() {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
            document.getElementById("weatherLocation").textContent = "Brak lokalizacji";
        }
    );
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const url =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
            `&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pl`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Błąd pobierania pogody");
        const data = await res.json();
        updateWeatherUI(data);
    } catch (err) {
        console.error(err);
        document.getElementById("weatherLocation").textContent = "Błąd pogody";
    }
}

function updateWeatherUI(data) {
    const locEl = document.getElementById("weatherLocation");
    const descEl = document.getElementById("weatherDescription");
    const tempEl = document.getElementById("weatherTemp");
    const feelsEl = document.getElementById("weatherFeels");
    const windEl = document.getElementById("weatherWind");
    const humEl = document.getElementById("weatherHumidity");
    const pressEl = document.getElementById("weatherPressure");
    const rainEl = document.getElementById("weatherRain");

    const name = data.name || "Twoja lokalizacja";
    const desc = data.weather?.[0]?.description || "–";
    const temp = Math.round(data.main?.temp ?? 0);
    const feels = Math.round(data.main?.feels_like ?? 0);
    const wind = data.wind?.speed != null ? data.wind.speed.toFixed(1) : "–";
    const hum = data.main?.humidity ?? "–";
    const press = data.main?.pressure ?? "–";

    const rain1h = data.rain?.["1h"] ?? 0;
    const snow1h = data.snow?.["1h"] ?? 0;
    const totalPrecip = rain1h + snow1h;

    locEl.textContent = name;
    descEl.textContent = desc;
    tempEl.textContent = `${temp}°C`;
    feelsEl.textContent = `odczuwalna ${feels}°C`;
    windEl.textContent = `${wind} m/s`;
    humEl.textContent = `${hum} %`;
    pressEl.textContent = `${press} hPa`;
    rainEl.textContent = totalPrecip > 0 ? `${totalPrecip.toFixed(1)} mm` : "brak";
}



/* ===============================
   MAPA
   =============================== */

let neskyMap = null;

function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    neskyMap = L.map("map").setView([51.1657, 10.4515], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(neskyMap);

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            neskyMap.setView([pos.coords.latitude, pos.coords.longitude], 12);
            L.marker([pos.coords.latitude, pos.coords.longitude])
                .addTo(neskyMap)
                .bindPopup("Tu jesteś");
        }
    );
}



/* ===============================
   MIEJSCA + ONBOARDING
   =============================== */

function initPlacesAndOnboarding() {
    const modal = document.getElementById("onboardingModal");
    const editBtn = document.getElementById("editPlaces");
    const saveBtn = document.getElementById("saveUserData");

    const homeInput = document.getElementById("homeAddress");
    const workInput = document.getElementById("workAddress");
    const fav1Input = document.getElementById("fav1");
    const fav2Input = document.getElementById("fav2");

    const saved = loadPlaces();

    if (saved) {
        homeInput.value = saved.home || "";
        workInput.value = saved.work || "";
        fav1Input.value = saved.fav1 || "";
        fav2Input.value = saved.fav2 || "";
    } else {
        modal.style.display = "flex";
    }

    editBtn.addEventListener("click", () => modal.style.display = "flex");

    saveBtn.addEventListener("click", () => {
        const places = {
            home: homeInput.value.trim(),
            work: workInput.value.trim(),
            fav1: fav1Input.value.trim(),
            fav2: fav2Input.value.trim()
        };
        localStorage.setItem(LOCAL_STORAGE_PLACES_KEY, JSON.stringify(places));
        modal.style.display = "none";
        renderNavigation();
    });
}

function loadPlaces() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_PLACES_KEY));
    } catch {
        return null;
    }
}



/* ===============================
   NAWIGACJA
   =============================== */

function initNavigation() {
    renderNavigation();
}

function renderNavigation() {
    const navEl = document.getElementById("navControls");
    const places = loadPlaces();

    if (!places) {
        navEl.textContent = "Brak zapisanych miejsc.";
        return;
    }

    const items = [
        { label: "Dom", value: places.home },
        { label: "Praca", value: places.work },
        { label: "Miejsce 1", value: places.fav1 },
        { label: "Miejsce 2", value: places.fav2 }
    ].filter(p => p.value);

    if (!items.length) {
        navEl.textContent = "Brak zapisanych miejsc.";
        return;
    }

    navEl.innerHTML = "";
    items.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "nav-place-btn";
        btn.textContent = `${item.label}: ${item.value}`;
        btn.onclick = () =>
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.value)}`, "_blank");
        navEl.appendChild(btn);
    });
}



/* ===============================
   WYDARZENIA — UI
   =============================== */

function initEventsUI() {
    const addEventBtn = document.getElementById("addEventBtn");
    const eventModal = document.getElementById("eventModal");

    const titleInput = document.getElementById("eventTitle");
    const dateInput = document.getElementById("eventDate");
    const timeInput = document.getElementById("eventTime");

    addEventBtn.addEventListener("click", () => {
        titleInput.value = "";
        dateInput.value = "";
        timeInput.value = "";
        eventModal.style.display = "flex";
    });

    document.getElementById("saveEventLocalBtn").addEventListener("click", () => {
        const title = titleInput.value.trim();
        const date = dateInput.value;
        const time = timeInput.value;

        if (!title || !date) return alert("Podaj tytuł i datę.");

        const events = loadLocalEvents();
        events.push({ title, date, time });
        localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));

        eventModal.style.display = "none";
        refreshAllEventsView();
    });

    document.getElementById("saveEventGoogleBtn").addEventListener("click", async () => {
        if (!googleAccessToken) return alert("Najpierw połącz z Google Calendar.");

        const title = titleInput.value.trim();
        const date = dateInput.value;
        const time = timeInput.value;

        if (!title || !date) return alert("Podaj tytuł i datę.");

        const startDateTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;
        const endDateTime = time ? `${date}T${time}:00` : `${date}T23:59:59`;

        const eventBody = {
            summary: title,
            start: { dateTime: startDateTime, timeZone: "Europe/Berlin" },
            end: { dateTime: endDateTime, timeZone: "Europe/Berlin" }
        };

        try {
            const response = await fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${googleAccessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(eventBody)
                }
            );

            if (!response.ok) return alert("Nie udało się zapisać wydarzenia w Google Calendar.");

            alert("Wydarzenie zapisane!");
            eventModal.style.display = "none";
            refreshAllEventsView();

        } catch {
            alert("Błąd podczas zapisywania wydarzenia.");
        }
    });

    refreshAllEventsView();
}

function loadLocalEvents() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY)) || [];
    } catch {
        return [];
    }
}



/* ===============================
   GOOGLE CALENDAR — LOGOWANIE
   =============================== */

function initGoogleLogin() {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse?.access_token) {
                googleAccessToken = tokenResponse.access_token;
                localStorage.setItem("neskyGoogleAccessToken", googleAccessToken);

                const btn = document.getElementById("googleConnectBtn");
                if (btn) btn.style.display = "none";

                refreshAllEventsView();
            }
        }
    });
}

function connectGoogleCalendar() {
    if (!googleTokenClient) initGoogleLogin();
    googleTokenClient.requestAccessToken();
}

window.connectGoogleCalendar = connectGoogleCalendar;



/* ===============================
   GOOGLE CALENDAR — POBIERANIE
   =============================== */

async function fetchGoogleEvents(localEvents = []) {
    if (!googleAccessToken) return renderEvents(localEvents);

    try {
        const now = new Date().toISOString();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(new Date().getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}&timeMax=${threeDaysLater.toISOString()}`,
            {
                headers: { Authorization: `Bearer ${googleAccessToken}` }
            }
        );

        const data = await response.json();
        if (!data.items) return renderEvents(localEvents);

        const googleEvents = data.items.map(ev => ({
            ...ev,
            source: "google"
        }));

        renderEvents([...googleEvents, ...localEvents]);

    } catch {
        renderEvents(localEvents);
    }
}



/* ===============================
   WYDARZENIA — RENDER
   =============================== */

function refreshAllEventsView() {
    const localEvents = loadLocalEvents().map(ev => ({
        source: "local",
        summary: ev.title,
        start: {
            dateTime: ev.time ? `${ev.date}T${ev.time}:00` : null,
            date: ev.date
        }
    }));

    if (googleAccessToken) fetchGoogleEvents(localEvents);
    else renderEvents(localEvents);
}

function renderEvents(events) {
    const container = document.getElementById("eventsList");
    container.innerHTML = "";

    if (!events.length) {
        container.innerHTML = "<p>Brak wydarzeń w najbliższych 3 dniach.</p>";
        return;
    }

    events.forEach(event => {
        const start = event.start.dateTime
            ? new Date(event.start.dateTime)
            : new Date(event.start.date + "T12:00:00");

        const dateStr = start.toLocaleDateString("pl-PL");
        const timeStr = event.start.dateTime
            ? start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
            : "Cały dzień";

        const sourceLabel = event.source === "local" ? "🟡 lokalne" : "🔵 Google";

        const div = document.createElement("div");
        div.className = "event-item";
        div.innerHTML = `
            <strong>${event.summary || "Bez nazwy"}</strong>
            <span class="event-time">${dateStr} • ${timeStr}</span>
            <span class="event-source">${sourceLabel}</span>
        `;
        container.appendChild(div);
    });
}
