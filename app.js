// ============================================================
// VOYANTA — app.js
// ============================================================
// PASO 1: Reemplazá SUPABASE_URL y SUPABASE_KEY con los tuyos.
// Los encontrás en: supabase.com → tu proyecto → Settings → API
// URL: Project URL
// KEY: anon / public (empieza con eyJ...)
// ============================================================

var SUPABASE_URL = "https://katapwuimxbknrjzormr.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdGFwd3VpbXhia25yanpvcm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTk4NDgsImV4cCI6MjA5MDIzNTg0OH0.i6_HgwaatloqYy4G49el1g1weA-mfX6q3uJCpSJIpXw";

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// ESTADO GLOBAL
// ============================================================

var state = {
  currentUser: null,
  trips: [],
  selectedTripId: null,
  forumPosts: []
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ============================================================
// AUTH
// ============================================================

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError("loginError", error.message);
  state.currentUser = data.user;
  updateUserUI();
  showApp();
}

async function signup(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) return showError("signupError", error.message);

  // Intentamos loguear directamente (si email confirm está desactivado en Supabase)
  if (data.session) {
    state.currentUser = data.user;
    updateUserUI();
    showApp();
  } else {
    showError("signupError", "¡Cuenta creada! Revisá tu email para confirmarla.");
  }
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

function updateUserUI() {
  const user = state.currentUser;
  if (!user) return;
  const name = user.user_metadata?.username || user.email.split("@")[0];
  const letter = name.charAt(0).toUpperCase();
  const email = user.email;

  const ids = ["userNameDisplay", "profileName"];
  const emailIds = ["userEmailDisplay", "profileEmail"];
  ids.forEach(id => { const el = $(` #${id}`); if (el) el.textContent = name; });
  emailIds.forEach(id => { const el = $(` #${id}`); if (el) el.textContent = email; });
  $$(".avatar, #profileAvatar").forEach(el => el.textContent = letter);
}

function showError(elId, msg) {
  const el = $(`#${elId}`);
  if (el) { el.textContent = msg; el.classList.remove("hidden"); }
}
function clearErrors() {
  $$(".form-error").forEach(el => { el.textContent = ""; el.classList.add("hidden"); });
}

// ============================================================
// TRIPS
// ============================================================

async function loadTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", state.currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return console.error("Error cargando trips:", error);
  state.trips = data || [];
  renderTrips();
  updateStats();
}

async function createTrip(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  const { error } = await supabase.from("trips").insert({
    user_id: state.currentUser.id,
    name: d.name,
    destination: d.destination,
    start_date: d.startDate || null,
    end_date: d.endDate || null,
    description: d.description || null,
    status: d.status || "planeado",
    base_currency: d.baseCurrency || "USD",
    cover_image: d.coverImage || null,
    budget: d.budget ? parseFloat(d.budget) : null
  });
  if (error) return alert(error.message);
  closeAllModals();
  form.reset();
  await loadTrips();
}

async function deleteTrip(id) {
  if (!confirm("¿Eliminar este viaje?")) return;
  await supabase.from("trips").delete().eq("id", id);
  state.selectedTripId = null;
  $("#tripDetailSection").classList.add("hidden");
  await loadTrips();
}

function openTrip(trip) {
  state.selectedTripId = trip.id;
  $("#tripDetailSection").classList.remove("hidden");
  $("#tripTitle").textContent = trip.name;
  $("#tripDescription").textContent = trip.description || "";
  $("#tripDestination").textContent = trip.destination;
  const start = trip.start_date ? new Date(trip.start_date).toLocaleDateString("es-AR") : "—";
  const end = trip.end_date ? new Date(trip.end_date).toLocaleDateString("es-AR") : "—";
  $("#tripDates").textContent = `${start} → ${end}`;
  if (trip.start_date && trip.end_date) {
    const days = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000);
    $("#tripDays").textContent = `${days} días`;
  }
  $("#tripStatusBadge").textContent = trip.status || "Planeado";
  if (trip.cover_image) {
    $("#tripCoverImage").style.backgroundImage = `url('${trip.cover_image}')`;
  } else {
    $("#tripCoverImage").style.backgroundImage = "linear-gradient(135deg, #1e3a5f, #0f2740)";
  }
  $("#overviewBudget").textContent = trip.budget ? `${trip.base_currency} ${trip.budget}` : "Sin definir";
  loadTripItems(trip.id);
  initMap("miniMap");
  initMap("fullMap");
}

async function loadTripItems(tripId) {
  const tables = [
    { table: "trip_transports", render: renderTransports },
    { table: "trip_stays", render: renderStays },
    { table: "trip_itinerary", render: renderItinerary },
    { table: "trip_activities", render: renderActivities },
    { table: "trip_expenses", render: renderExpenses },
    { table: "trip_notes", render: renderNotes }
  ];
  for (const { table, render } of tables) {
    const { data } = await supabase.from(table).select("*").eq("trip_id", tripId).order("created_at");
    render(data || []);
  }
}

function renderTransports(items) {
  const el = $("#transportList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay tramos de transporte aún."); return; }
  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <div><h4>${i.origin} → ${i.destination}</h4></div>
        <span class="badge">${i.type}</span>
      </div>
      <div class="item-meta">
        <span><i class="fa-solid fa-calendar"></i> ${fmtDate(i.departure)}</span>
        ${i.company ? `<span><i class="fa-solid fa-building"></i> ${i.company}</span>` : ""}
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${i.cost}</span>` : ""}
      </div>
      ${i.notes ? `<p class="item-notes">${i.notes}</p>` : ""}
    </div>
  `).join("");
}

function renderStays(items) {
  const el = $("#stayList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay alojamientos aún."); return; }
  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <div><h4>${i.name}</h4><p class="muted">${i.address || ""}</p></div>
        <span class="badge">${i.type}</span>
      </div>
      <div class="item-meta">
        ${i.check_in ? `<span><i class="fa-solid fa-right-to-bracket"></i> ${fmtDate(i.check_in)}</span>` : ""}
        ${i.check_out ? `<span><i class="fa-solid fa-right-from-bracket"></i> ${fmtDate(i.check_out)}</span>` : ""}
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${i.cost}</span>` : ""}
      </div>
    </div>
  `).join("");
}

function renderItinerary(items) {
  const el = $("#itineraryDays");
  if (!items.length) { el.innerHTML = emptyMsg("Sin actividades en el itinerario."); return; }
  const byDay = {};
  items.forEach(i => {
    const day = i.date || "Sin fecha";
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(i);
  });
  el.innerHTML = Object.entries(byDay).map(([day, acts]) => `
    <div class="day-block">
      <div class="day-header"><strong>${fmtDate(day)}</strong></div>
      <div class="day-timeline">
        ${acts.map(a => `
          <div class="timeline-item">
            <span class="timeline-time">${a.time || "--:--"}</span>
            <div class="timeline-content">
              <h4>${a.title}</h4>
              <p>${a.place || ""} ${a.description || ""}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function renderActivities(items) {
  const el = $("#activityList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay excursiones aún."); return; }
  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <h4>${i.name}</h4>
        <span class="badge">${i.booking_status || "pendiente"}</span>
      </div>
      <div class="item-meta">
        ${i.date ? `<span><i class="fa-solid fa-calendar"></i> ${fmtDate(i.date)}</span>` : ""}
        ${i.place ? `<span><i class="fa-solid fa-location-dot"></i> ${i.place}</span>` : ""}
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${i.cost}</span>` : ""}
      </div>
    </div>
  `).join("");
}

function renderExpenses(items) {
  const el = $("#expenseList");
  const summaryEl = $("#expenseSummary");
  if (!items.length) { el.innerHTML = emptyMsg("Sin gastos cargados."); summaryEl.innerHTML = ""; return; }

  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <h4>${i.concept}</h4>
        <strong>${i.currency} ${i.amount}</strong>
      </div>
      <div class="item-meta">
        <span class="badge">${i.category}</span>
        ${i.date ? `<span><i class="fa-solid fa-calendar"></i> ${fmtDate(i.date)}</span>` : ""}
      </div>
    </div>
  `).join("");

  const totals = {};
  items.forEach(i => { totals[i.currency] = (totals[i.currency] || 0) + parseFloat(i.amount); });
  summaryEl.innerHTML = Object.entries(totals).map(([cur, total]) => `
    <div class="summary-item"><span>${cur}</span><strong>${total.toFixed(2)}</strong></div>
  `).join("");

  const trip = state.trips.find(t => t.id === state.selectedTripId);
  if (trip?.budget) {
    const totalInBase = totals[trip.base_currency] || 0;
    $("#overviewSpent").textContent = `${trip.base_currency} ${totalInBase.toFixed(2)}`;
  }
}

function renderNotes(items) {
  const el = $("#noteList");
  if (!items.length) { el.innerHTML = emptyMsg("Sin notas."); return; }
  el.innerHTML = items.map(i => `
    <div class="note-card">
      <h4>${i.title}</h4>
      <span class="badge">${i.type}</span>
      <p>${i.content}</p>
    </div>
  `).join("");
}

function renderTrips() {
  const container = $("#tripGrid");
  const empty = $("#emptyTrips");
  if (!state.trips.length) {
    empty.classList.remove("hidden");
    container.innerHTML = "";
    return;
  }
  empty.classList.add("hidden");
  container.innerHTML = state.trips.map(trip => {
    const bg = trip.cover_image
      ? `background-image:url('${trip.cover_image}')`
      : `background: linear-gradient(135deg, #1e3a5f, #0f2740)`;
    return `
      <div class="trip-card" style="${bg}" onclick="openTrip(${JSON.stringify(trip).replace(/"/g, '&quot;')})">
        <div class="trip-card-content">
          <div class="card-top">
            <span class="badge">${trip.status || "planeado"}</span>
            <button class="btn btn-ghost danger" style="padding:6px 10px;font-size:12px;"
              onclick="event.stopPropagation(); deleteTrip('${trip.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <h4>${trip.name}</h4>
          <p>${trip.destination}</p>
          <div class="trip-card-meta">
            ${trip.start_date ? `<span><i class="fa-solid fa-calendar"></i> ${fmtDate(trip.start_date)}</span>` : ""}
            ${trip.budget ? `<span><i class="fa-solid fa-wallet"></i> ${trip.base_currency} ${trip.budget}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function updateStats() {
  $("#statTrips").textContent = state.trips.length;
  $("#statInProgress").textContent = state.trips.filter(t => t.status === "en curso").length;
}

// ============================================================
// TRIP ITEM FORMS (transport, stay, itinerary, activity, expense, note)
// ============================================================

async function saveTripItem(table, form, extraFields = {}) {
  const d = Object.fromEntries(new FormData(form).entries());
  const payload = { ...d, ...extraFields, trip_id: state.selectedTripId };
  const { error } = await supabase.from(table).insert(payload);
  if (error) return alert(error.message);
  closeAllModals();
  form.reset();
  loadTripItems(state.selectedTripId);
}

// ============================================================
// FORUM — PÚBLICO (sin login para leer, login para escribir)
// ============================================================

async function loadForum() {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false });

  if (error) { console.error("Error foro:", error); return; }
  state.forumPosts = data || [];
  renderForum();
}

function renderForum() {
  const el = $("#forumList");
  if (!state.forumPosts.length) {
    el.innerHTML = `<div class="empty-state"><p class="muted">No hay publicaciones todavía.</p></div>`;
    return;
  }
  el.innerHTML = state.forumPosts.map(post => {
    const author = post.profiles?.username || "Viajero";
    const date = new Date(post.created_at).toLocaleDateString("es-AR");
    return `
      <div class="forum-card">
        <div>
          <span class="badge">${post.category || "General"}</span>
          <h4>${post.title}</h4>
          <p>${post.content}</p>
        </div>
        <div class="forum-card-footer">
          <span><i class="fa-solid fa-user"></i> ${author}</span>
          <span><i class="fa-solid fa-calendar"></i> ${date}</span>
        </div>
      </div>
    `;
  }).join("");
}

async function createPost(form) {
  if (!state.currentUser) {
    alert("Tenés que iniciar sesión para publicar en el foro.");
    return;
  }
  const d = Object.fromEntries(new FormData(form).entries());
  const { error } = await supabase.from("forum_posts").insert({
    user_id: state.currentUser.id,
    title: d.title,
    content: d.content,
    category: d.category
  });
  if (error) return alert(error.message);
  closeAllModals();
  form.reset();
  await loadForum();
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function showSection(sectionId) {
  $$(".page-section").forEach(s => s.classList.remove("active"));
  $$(".nav-item").forEach(b => b.classList.remove("active"));
  const section = $(`#${sectionId}`);
  if (section) section.classList.add("active");
  const btn = $(`[data-section="${sectionId}"]`);
  if (btn) btn.classList.add("active");

  const titles = {
    dashboardSection: "Mis viajes",
    communitySection: "Foro de viajeros",
    profileSection: "Mi perfil"
  };
  $("#pageTitle").textContent = titles[sectionId] || "";

  // Mostrar/ocultar botón crear viaje
  const createBtn = $("#createTripBtn");
  createBtn.style.display = sectionId === "dashboardSection" ? "inline-flex" : "none";

  // Cargar foro si corresponde
  if (sectionId === "communitySection") loadForum();
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");
  loadTrips();
  // El foro se carga en communitySection cuando navegás
}

// ============================================================
// MAPAS (Leaflet)
// ============================================================

const initializedMaps = {};

function initMap(id) {
  const el = $(`#${id}`);
  if (!el || initializedMaps[id]) return;
  initializedMaps[id] = L.map(id).setView([-34.6, -58.4], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(initializedMaps[id]);
}

// ============================================================
// MODALES
// ============================================================

function openModal(id) {
  $("#modalBackdrop").classList.remove("hidden");
  $(`#${id}`).classList.remove("hidden");
}

function closeAllModals() {
  $$(".modal").forEach(m => m.classList.add("hidden"));
  $("#modalBackdrop").classList.add("hidden");
}

// ============================================================
// TABS (dentro del detalle del viaje)
// ============================================================

function activateTab(tabId, tabsContainerId = "tripTabs") {
  const container = $(`#${tabsContainerId}`);
  if (!container) return;
  container.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  $$(".tab-panel").forEach(p => p.classList.remove("active"));
  const btn = container.querySelector(`[data-tab="${tabId}"]`);
  if (btn) btn.classList.add("active");
  const panel = $(`#${tabId}`);
  if (panel) panel.classList.add("active");

  if (tabId === "mapPanel") setTimeout(() => {
    Object.values(initializedMaps).forEach(m => m.invalidateSize());
  }, 100);
}

// ============================================================
// HELPERS
// ============================================================

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function emptyMsg(msg) {
  return `<p class="muted" style="padding:14px 0;">${msg}</p>`;
}

// ============================================================
// BÚSQUEDA DE VIAJES
// ============================================================

$("#searchTrips") && document.addEventListener("DOMContentLoaded", () => {
  const searchInput = $("#searchTrips");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      $$(".trip-card").forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? "" : "none";
      });
    });
  }
});

// ============================================================
// EVENTOS (DOM ready)
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  // Verificar sesión activa
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    state.currentUser = data.user;
    updateUserUI();
    showApp();
  } else {
    // Cargar foro público aunque no haya sesión (para la sección comunidad visible sin login)
    // La comunidad solo se ve si el usuario está logueado en esta app, pero el foro
    // tiene RLS con lectura pública en Supabase.
  }

  // LOGIN
  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault();
    clearErrors();
    const f = new FormData(e.target);
    login(f.get("email"), f.get("password"));
  });

  // SIGNUP
  $("#signupForm").addEventListener("submit", e => {
    e.preventDefault();
    clearErrors();
    const f = new FormData(e.target);
    signup(f.get("email"), f.get("password"), f.get("username"));
  });

  // LOGOUT
  $("#logoutBtn").addEventListener("click", logout);

  // NAVEGACIÓN SIDEBAR
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      if (section) showSection(section);
    });
  });

  // BOTÓN CREAR VIAJE
  $("#createTripBtn").addEventListener("click", () => openModal("tripModal"));

  // FORM CREAR VIAJE
  $("#tripForm").addEventListener("submit", e => {
    e.preventDefault();
    createTrip(e.target);
  });

  // FORM FORO
  $("#postForm").addEventListener("submit", e => {
    e.preventDefault();
    createPost(e.target);
  });

  // FORMS TRIP ITEMS
  const tripItemForms = {
    transportForm: "trip_transports",
    stayForm: "trip_stays",
    itineraryForm: "trip_itinerary",
    activityForm: "trip_activities",
    expenseForm: "trip_expenses",
    noteForm: "trip_notes"
  };
  Object.entries(tripItemForms).forEach(([formId, table]) => {
    const form = $(`#${formId}`);
    if (form) form.addEventListener("submit", e => {
      e.preventDefault();
      saveTripItem(table, e.target);
    });
  });

  // TABS del detalle del viaje
  $$("#tripTabs .tab").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // CERRAR MODALES
  document.addEventListener("click", e => {
    if (e.target.classList.contains("close-modal")) closeAllModals();
    if (e.target.id === "modalBackdrop") closeAllModals();
  });

  // BOTONES data-open-modal
  $$("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.dataset.openModal));
  });

  // BOTÓN NUEVA PUBLICACIÓN en foro
  $("[data-open-modal='postModal']") && document.addEventListener("click", e => {
    const btn = e.target.closest("[data-open-modal='postModal']");
    if (btn) openModal("postModal");
  });

  // TABS AUTH — manejado con onclick inline en index.html

  // EDITAR / ELIMINAR trip desde detalle
  $("#editTripBtn") && $("#editTripBtn").addEventListener("click", () => {
    const trip = state.trips.find(t => t.id === state.selectedTripId);
    if (!trip) return;
    // Pre-poblar form
    const form = $("#tripForm");
    Object.entries({
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      description: trip.description,
      status: trip.status,
      baseCurrency: trip.base_currency,
      coverImage: trip.cover_image,
      budget: trip.budget,
      tripId: trip.id
    }).forEach(([k, v]) => {
      const input = form.querySelector(`[name="${k}"]`);
      if (input) input.value = v || "";
    });
    openModal("tripModal");
  });

  $("#deleteTripBtn") && $("#deleteTripBtn").addEventListener("click", () => {
    if (state.selectedTripId) deleteTrip(state.selectedTripId);
  });

});
