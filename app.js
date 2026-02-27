/* ===============================
   KONFIGURACJA
   =============================== */

const OPENWEATHER_API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1"; // ← Wstaw swój klucz OpenWeatherMap

const GOOGLE_CLIENT_ID = "59559337506-iul40kn2gsjschbkdl92jabsp4slfjaa.apps.googleusercontent.com";
const GOOGLE_SCOPES =
    "https://www.googleapis.com/auth/calendar " +
    "https://www.googleapis.com/auth/calendar.events " +
    "https://www.googleapis.com/auth/gmail.readonly";

let googleAccessToken = null;
let googleTokenClient = null;

const LOCAL_STORAGE_PLACES_KEY = "neskyUserPlaces";
const LOCAL_STORAGE_EVENTS_KEY = "neskyLocalEvents";



/* ===============================
   JĘZYK APLIKACJI — AUTO-DETEKCJA
   =============================== */

let APP_LANG = "pl"; // domyślnie

const translations = {
    pl: {
        searchPlaceholder: "Szukaj w Google...",
        weather: "Pogoda",
        feels: "odczuwalna",
        wind: "Wiatr",
        humidity: "Wilgotność",
        pressure: "Ciśnienie",
        rain: "Opady",
        noRain: "brak",
        map: "Mapa",
        navigation: "Nawigacja",
        editPlaces: "Edytuj miejsca ✏️",
        events: "Wydarzenia",
        connectGoogle: "Połącz z Google Calendar",
        addEvent: "Dodaj wydarzenie ➕",
        home: "Dom",
        work: "Praca",
        place1: "Miejsce 1",
        place2: "Miejsce 2",
        weatherError: "Błąd pogody"
    },

    en: {
        searchPlaceholder: "Search in Google...",
        weather: "Weather",
        feels: "feels like",
        wind: "Wind",
        humidity: "Humidity",
        pressure: "Pressure",
        rain: "Rain",
        noRain: "none",
        map: "Map",
        navigation: "Navigation",
        editPlaces: "Edit places ✏️",
        events: "Events",
        connectGoogle: "Connect Google Calendar",
        addEvent: "Add event ➕",
        home: "Home",
        work: "Work",
        place1: "Place 1",
        place2: "Place 2",
        weatherError: "Weather error"
    },

    de: {
        searchPlaceholder: "In Google suchen...",
        weather: "Wetter",
        feels: "gefühlt",
        wind: "Wind",
        humidity: "Luftfeuchtigkeit",
        pressure: "Druck",
        rain: "Niederschlag",
        noRain: "kein",
        map: "Karte",
        navigation: "Navigation",
        editPlaces: "Orte bearbeiten ✏️",
        events: "Termine",
        connectGoogle: "Mit Google Kalender verbinden",
        addEvent: "Termin hinzufügen ➕",
        home: "Zuhause",
        work: "Arbeit",
        place1: "Ort 1",
        place2: "Ort 2",
        weatherError: "Wetterfehler"
    }
};

function detectLanguage() {
    const lang = (navigator.language || "pl").slice(0, 2);
    APP_LANG = translations[lang] ? lang : "en";
}

function applyTranslations() {
    const t = translations[APP_LANG];

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const weatherCardTitle = document.querySelector("#weatherCard h2");
    if (weatherCardTitle) weatherCardTitle.textContent = t.weather;

    const mapCardTitle = document.querySelector("#map")?.parentElement?.querySelector("h2");
    if (mapCardTitle) mapCardTitle.textContent = t.map;

    const navCardTitle = document.querySelector("#navControls")?.parentElement?.querySelector("h2");
    if (navCardTitle) navCardTitle.textContent = t.navigation;

    const editBtn = document.getElementById("editPlaces");
    if (editBtn) editBtn.textContent = t.editPlaces;

    const googleBtn = document.getElementById("googleConnectBtn");
    if (googleBtn) googleBtn.textContent = t.connectGoogle;

    const addEventBtn = document.getElementById("addEventBtn");
    if (addEventBtn) addEventBtn.textContent = t.addEvent;
}



/* ===============================
   START APLIKACJI
   =============================== */

document.addEventListener("DOMContentLoaded", () => {
    detectLanguage();
    applyTranslations();

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

    setTimeout(fetchUnreadEmails, 1500);
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
            document.getElementById("weatherLocation").textContent =
                translations[APP_LANG].weatherError;
        }
    );
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const url =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
            `&appid=${OPENWEATHER_API_KEY}&units=metric&lang=${APP_LANG}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Błąd pobierania pogody");
        const data = await res.json();
        updateWeatherUI(data);
    } catch (err) {
        console.error(err);
        document.getElementById("weatherLocation").textContent =
            translations[APP_LANG].weatherError;
    }
}

function updateWeatherUI(data) {
    const t = translations[APP_LANG];

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
    feelsEl.textContent = `${t.feels} ${feels}°C`;
    windEl.textContent = `${wind} m/s`;
    humEl.textContent = `${hum} %`;
    pressEl.textContent = `${press} hPa`;
    rainEl.textContent = totalPrecip > 0 ? `${totalPrecip.toFixed(1)} mm` : t.noRain;
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
    const t = translations[APP_LANG];

    if (!places) {
        navEl.textContent = "Brak zapisanych miejsc.";
        return;
    }

    const items = [
        { label: t.home, value: places.home },
        { label: t.work, value: places.work },
        { label: t.place1, value: places.fav1 },
        { label: t.place2, value: places.fav2 }
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
                fetchUnreadEmails();
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



/* ===============================
   GMAIL — LICZBA NOWYCH WIADOMOŚCI
   =============================== */

async function fetchUnreadEmails() {
    const statusEl = document.getElementById("emailStatus");
    if (!statusEl) return;

    if (!googleAccessToken) {
        statusEl.textContent = "Połącz z Google, aby sprawdzić pocztę.";
        return;
    }

    try {
        const response = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=UNREAD&maxResults=50",
            {
                headers: {
                    Authorization: `Bearer ${googleAccessToken}`
                }
            }
        );

        if (!response.ok) {
            statusEl.textContent = "Błąd pobierania poczty.";
            return;
        }

        const data = await response.json();
        const unreadCount = data.resultSizeEstimate ?? 0;

        if (unreadCount === 0) {
            statusEl.textContent = "Brak nowych wiadomości.";
        } else {
            statusEl.textContent = `Nowe wiadomości: ${unreadCount}`;
        }

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Błąd połączenia z pocztą.";
    }
}

setInterval(fetchUnreadEmails, 60000);
