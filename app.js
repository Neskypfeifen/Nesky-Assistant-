// ===============================
//  KONFIGURACJA
// ===============================

const OPENWEATHER_API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

const GOOGLE_CLIENT_ID = "59559337506-iul40kn2gsjschbkdl92jabsp4slfjaa.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

let googleAccessToken = null;
let googleTokenClient = null;

const LOCAL_STORAGE_PLACES_KEY = "neskyUserPlaces";
const LOCAL_STORAGE_EVENTS_KEY = "neskyLocalEvents";
const LOCAL_STORAGE_THEME_KEY = "neskyTheme";


// ===============================
//  INICJALIZACJA APLIKACJI
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    googleAccessToken = localStorage.getItem("neskyGoogleAccessToken") || null;

    initTheme();
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


// ===============================
//  MOTYW
// ===============================

function initTheme() {
    const btn = document.getElementById("themeToggle");
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);

    if (saved === "dark") {
        document.body.classList.add("dark");
        if (btn) btn.textContent = "☀️";
    }

    if (btn) {
        btn.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            const isDark = document.body.classList.contains("dark");
            localStorage.setItem(LOCAL_STORAGE_THEME_KEY, isDark ? "dark" : "light");
            btn.textContent = isDark ? "☀️" : "🌙";
        });
    }
}


// ===============================
//  WYSZUKIWARKA GOOGLE
// ===============================

function initSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    window.searchGoogle = function () {
        const q = input.value.trim();
        if (!q) return;
        const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        window.open(url, "_blank");
    };
}


// ===============================
//  POGODA
// ===============================

function initWeather() {
    const weatherEl = document.getElementById("weather");
    if (!weatherEl) return;

    if (!navigator.geolocation) {
        weatherEl.textContent = "Brak dostępu do lokalizacji.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            loadWeather(latitude, longitude);
        },
        () => {
            weatherEl.textContent = "Nie udało się pobrać lokalizacji.";
        }
    );
}

async function loadWeather(lat, lon) {
    const weatherEl = document.getElementById("weather");
    if (!weatherEl) return;

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pl`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.main) {
            weatherEl.textContent = "Nie udało się pobrać pogody.";
            return;
        }

        const temp = Math.round(data.main.temp);
        const desc = data.weather?.[0]?.description || "";
        const city = data.name || "";

        weatherEl.innerHTML = `
            <p><strong>${city}</strong></p>
            <p>${temp}°C, ${desc}</p>
        `;
    } catch (e) {
        weatherEl.textContent = "Błąd ładowania pogody.";
    }
}


// ===============================
//  MAPA
// ===============================

let neskyMap = null;

function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    neskyMap = L.map("map").setView([51.1657, 10.4515], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(neskyMap);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                neskyMap.setView([latitude, longitude], 12);
                L.marker([latitude, longitude]).addTo(neskyMap).bindPopup("Tu jesteś");
            },
            () => {}
        );
    }
}


// ===============================
//  MIEJSCA + ONBOARDING
// ===============================

function initPlacesAndOnboarding() {
    const editBtn = document.getElementById("editPlaces");
    const modal = document.getElementById("onboardingModal");
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
        modal.style.display = "block";
    }

    editBtn.addEventListener("click", () => modal.style.display = "block");

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


// ===============================
//  NAWIGACJA
// ===============================

function initNavigation() {
    renderNavigation();
}

function renderNavigation() {
    const navEl = document.getElementById("navControls");
    if (!navEl) return;

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
        btn.addEventListener("click", () => {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.value)}`;
            window.open(url, "_blank");
        });
        navEl.appendChild(btn);
    });
}


// ===============================
//  WYDARZENIA – UI
// ===============================

function initEventsUI() {
    const addEventBtn = document.getElementById("addEventBtn");
    const eventModal = document.getElementById("eventModal");
    const saveLocalBtn = document.getElementById("saveEventLocalBtn");
    const saveGoogleBtn = document.getElementById("saveEventGoogleBtn");

    const titleInput = document.getElementById("eventTitle");
    const dateInput = document.getElementById("eventDate");
    const timeInput = document.getElementById("eventTime");

    addEventBtn.addEventListener("click", () => {
        titleInput.value = "";
        dateInput.value = "";
        timeInput.value = "";
        eventModal.style.display = "block";
    });

    saveLocalBtn.addEventListener("click", () => {
        const title = titleInput.value.trim();
        const date = dateInput.value;
        const time = timeInput.value;

        if (!title || !date) {
            alert("Podaj tytuł i datę.");
            return;
        }

        const events = loadLocalEvents();
        events.push({
            title,
            date,
            time,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));

        eventModal.style.display = "none";
        refreshAllEventsView();
    });

    saveGoogleBtn.addEventListener("click", async () => {
        const title = titleInput.value.trim();
        const date = dateInput.value;
        const time = timeInput.value;

        if (!title || !date) {
            alert("Podaj tytuł i datę.");
            return;
        }

        if (!googleAccessToken) {
            alert("Najpierw połącz się z Google Calendar.");
            return;
        }

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

            if (!response.ok) {
                alert("Nie udało się zapisać wydarzenia w Google Calendar.");
                return;
            }

            alert("Wydarzenie zapisane w Google Calendar!");
            eventModal.style.display = "none";
            refreshAllEventsView();

        } catch (e) {
            alert("Wystąpił błąd podczas zapisywania wydarzenia.");
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


// ===============================
//  GOOGLE CALENDAR – LOGOWANIE
// ===============================

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


// ===============================
//  GOOGLE CALENDAR – POBIERANIE
// ===============================

async function fetchGoogleEvents(localEvents = []) {
    if (!googleAccessToken) {
        renderEvents(localEvents);
        return;
    }

    try {
        const now = new Date().toISOString();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(new Date().getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}&timeMax=${threeDaysLater.toISOString()}`,
            {
                headers: {
                    Authorization: `Bearer ${googleAccessToken}`
                }
            }
        );

        const data = await response.json();

        if (!data.items) {
            renderEvents(localEvents);
            return;
        }

        const googleEvents = data.items.map(ev => ({
            ...ev,
            source: "google"
        }));

        const all = [...googleEvents, ...localEvents];
        renderEvents(all);

    } catch (error) {
        renderEvents(localEvents);
    }
}


// ===============================
//  FILTROWANIE – 3 DNI
// ===============================

function filterEventsForNext3Days(events) {
    const now = new Date();

    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    return events
        .filter(event => {
            const start = event.start.dateTime
                ? new Date(event.start.dateTime)
                : new Date(event.start.date + "T12:00:00");

            return start >= now && start <= threeDaysLater;
        })
        .sort((a, b) => {
            const aDate = a.start.dateTime
                ? new Date(a.start.dateTime)
                : new Date(a.start.date + "T12:00:00");

            const bDate = b.start.dateTime
                ? new Date(b.start.dateTime)
                : new Date(b.start.date + "T12:00:00");

            return aDate - bDate;
        });
}


// ===============================
//  RENDEROWANIE WYDARZEŃ
// ===============================

function renderEvents(events) {
    const container = document.getElementById("eventsList");
    if (!container) return;

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
            <strong>${event.summary || event.title || "Bez nazwy"}</strong>
            <span class="event-time">${dateStr} • ${timeStr}</span>
            <span class="event-source">${sourceLabel}</span>
        `;
        container.appendChild(div);
    });
}
