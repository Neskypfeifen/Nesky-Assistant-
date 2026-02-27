// ===============================
//  GOOGLE CALENDAR – KONFIGURACJA
// ===============================

const GOOGLE_CLIENT_ID = "59559337506-iul40kn2gsjschbkdl92jabsp4slfjaa.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

let googleAccessToken = null;
let googleTokenClient = null;


// ===============================
//  LOGOWANIE DO GOOGLE
// ===============================

function initGoogleLogin() {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                googleAccessToken = tokenResponse.access_token;
                localStorage.setItem("neskyGoogleAccessToken", googleAccessToken);

                fetchGoogleEvents(); // po zalogowaniu od razu pobieramy wydarzenia
            }
        }
    });
}

function connectGoogleCalendar() {
    if (!googleTokenClient) {
        initGoogleLogin();
    }
    googleTokenClient.requestAccessToken();
}


// ===============================
//  POBIERANIE WYDARZEŃ
// ===============================

async function fetchGoogleEvents() {
    if (!googleAccessToken) {
        console.error("Brak tokenu Google.");
        return;
    }

    try {
        const response = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime",
            {
                headers: {
                    Authorization: `Bearer ${googleAccessToken}`
                }
            }
        );

        const data = await response.json();

        if (!data.items) {
            console.error("Brak wydarzeń w kalendarzu.");
            renderEvents([]);
            return;
        }

        const filtered = filterEventsForNext3Days(data.items);
        renderEvents(filtered);

    } catch (error) {
        console.error("Błąd pobierania wydarzeń:", error);
        renderEvents([]);
    }
}


// ===============================
//  FILTROWANIE – 3 NAJBLIŻSZE DNI
// ===============================

function filterEventsForNext3Days(events) {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    return events
        .filter(event => {
            const start = new Date(event.start.dateTime || event.start.date);
            return start >= now && start <= threeDaysLater;
        })
        .sort((a, b) => {
            const aDate = new Date(a.start.dateTime || a.start.date);
            const bDate = new Date(b.start.dateTime || b.start.date);
            return aDate - bDate;
        });
}


// ===============================
//  RENDEROWANIE WYDARZEŃ
// ===============================

function renderEvents(events) {
    const container = document.getElementById("eventsList");
    if (!container) {
        console.error("Nie znaleziono elementu #eventsList.");
        return;
    }

    container.innerHTML = "";

    if (events.length === 0) {
        container.innerHTML = "<p>Brak wydarzeń w najbliższych 3 dniach.</p>";
        return;
    }

    events.forEach(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const dateStr = start.toLocaleDateString("pl-PL");
        const timeStr = event.start.dateTime
            ? start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
            : "Cały dzień";

        const div = document.createElement("div");
        div.className = "event-item";
        div.innerHTML = `
            <strong>${dateStr}</strong> ${timeStr} – ${event.summary || "Bez nazwy"}
        `;
        container.appendChild(div);
    });
}
