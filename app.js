// 🔧 Klucz API pogody
const API_KEY = "b29b1069f8cdd5ddc69d6fcc9592c4a1";

// 🌙 Tryb jasny/ciemny
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

// 🔍 Wyszukiwanie Google
function searchGoogle() {
    const query = document.getElementById("searchInput").value;
    if (query.trim() !== "") {
        window.open("https://www.google.com/search?q=" + encodeURIComponent(query));
    }
}

// 🌤 Pogoda
function loadWeather(lat, lon) {
    const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pl`;

    fetch(url)
        .then(r => r.json())
        .then(data => {
            const temp = Math.round(data.main.temp);
            const desc = data.weather[0].description;
            const icon = data.weather[0].icon;

            document.getElementById("weather").innerHTML = `
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png">
                <strong>${temp}°C</strong> – ${desc}
            `;
        })
        .catch(() => {
            document.getElementById("weather").textContent = "Błąd pobierania pogody.";
        });
}

// 🗺️ Próba załadowania mapy (z linkiem awaryjnym)
function loadTrafficMap(lat, lon) {
    const src = `https://www.bing.com/maps/embed?h=260&w=500&cp=${lat}~${lon}&lvl=12&typ=d&sty=r&trfc=1`;

    document.getElementById("mapContainer").innerHTML = `
        <iframe
            width="100%"
            height="260"
            style="border:0; border-radius:10px;"
            src="${src}"
            scrolling="no">
        </iframe>
        <p style="margin-top:8px; font-size:0.85rem; opacity:0.8;">
            Jeśli mapa się nie wyświetla, możesz otworzyć ruch drogowy bezpośrednio:
            <a href="https://www.bing.com/maps?cp=${lat}~${lon}&lvl=12&sty=r&trfc=1" target="_blank">Otwórz w Bing Maps</a>
        </p>
    `;
}

// 🧭 Nawigacja – zapisane miejsca + dowolny cel
function renderNavControls(user) {
    const container = document.getElementById("navControls");

    const places = [];

    if (user.home) places.push({ label: "Dom 🏠", value: user.home });
    if (user.work) places.push({ label: "Praca 💼", value: user.work });
    if (user.fav1) places.push({ label: "Miejsce 1 ⭐", value: user.fav1 });
    if (user.fav2) places.push({ label: "Miejsce 2 ⭐", value: user.fav2 });

    let buttonsHtml = "";

    if (places.length > 0) {
        buttonsHtml += `<p style="margin-bottom:6px;">Szybka nawigacja:</p><div style="display:flex; flex-wrap:wrap; gap:6px;">`;
        for (const p of places) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.value)}&travelmode=driving`;
            buttonsHtml += `
                <a href="${url}" target="_blank"
                   style="flex:1; text-align:center; padding:8px 10px; border-radius:8px; background:#2563eb; color:white; text-decoration:none; font-size:0.9rem;">
                    ${p.label}
                </a>
            `;
        }
        buttonsHtml += `</div>`;
    }

    const customNav = `
        <div style="margin-top:10px;">
            <input id="navTarget" type="text" placeholder="Dokąd chcesz jechać?"
                   style="width:100%; padding:9px 10px; border-radius:8px; border:1px solid #d1d5db;">
            <button id="startNav"
                    style="margin-top:8px; width:100%; padding:9px 10px; border-radius:8px; border:none; background:#16a34a; color:white; font-weight:600;">
                Nawiguj z mojej lokalizacji 🚗
            </button>
        </div>
    `;

    container.innerHTML = buttonsHtml + customNav;

    document.getElementById("startNav").onclick = () => {
        const target = document.getElementById("navTarget").value.trim();
        if (!target) {
            alert("Podaj cel podróży.");
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=driving`;
        window.open(url, "_blank");
    };
}

// 🔵 ONBOARDING
function showOnboarding() {
    const modal = document.getElementById("onboardingModal");
    modal.style.display = "flex";

    document.getElementById("saveUserData").onclick = () => {
        const userData = {
            home: document.getElementById("homeAddress").value.trim(),
            work: document.getElementById("workAddress").value.trim(),
            fav1: document.getElementById("fav1").value.trim(),
            fav2: document.getElementById("fav2").value.trim()
        };

        localStorage.setItem("neskyUser", JSON.stringify(userData));
        modal.style.display = "none";

        renderNavControls(userData);
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

// 📍 Lokalizacja + start
function initApp() {
    checkUserData();

    if (!navigator.geolocation) {
        document.getElementById("weather").textContent = "Brak dostępu do lokalizacji.";
        document.getElementById("mapContainer").textContent = "Brak dostępu do lokalizacji – mapa niedostępna.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            loadWeather(lat, lon);
            loadTrafficMap(lat, lon);
        },
        () => {
            document.getElementById("weather").textContent = "Odmowa dostępu do lokalizacji.";
            document.getElementById("mapContainer").textContent = "Odmowa dostępu do lokalizacji – mapa niedostępna.";
        }
    );
}

initApp();