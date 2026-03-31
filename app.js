// ============================================================
// MIVIAJE — app.js
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
  forumPosts: [],
  costs: { transports: {}, stays: {}, activities: {}, expenses: {} }
};

function sumCosts(items, amountField, currencyField) {
  amountField = amountField || 'cost';
  currencyField = currencyField || 'currency';
  var totals = {};
  items.forEach(function(i) {
    var amt = parseFloat(i[amountField]);
    var cur = (i[currencyField] || 'USD').toUpperCase();
    if (!isNaN(amt) && amt > 0) totals[cur] = (totals[cur] || 0) + amt;
  });
  return totals;
}

function fmtTotals(totals) {
  var entries = Object.entries(totals);
  if (!entries.length) return '—';
  return entries.map(function(e) { return e[0] + ' ' + e[1].toFixed(2); }).join(' · ');
}

function mergeTotals() {
  var merged = {};
  Array.from(arguments).forEach(function(obj) {
    Object.entries(obj).forEach(function(e) {
      merged[e[0]] = (merged[e[0]] || 0) + e[1];
    });
  });
  return merged;
}

function subtotalBar(totals, label) {
  var entries = Object.entries(totals);
  if (!entries.length) return '';
  var texto = entries.map(function(e) { return '<strong>' + e[0] + ' ' + e[1].toFixed(2) + '</strong>'; }).join(' &nbsp;·&nbsp; ');
  return '<div class="subtotal-bar"><span><i class="fa-solid fa-calculator"></i> ' + label + '</span><div>' + texto + '</div></div>';
}

function updateGlobalSpent() {
  var all = mergeTotals(state.costs.transports, state.costs.stays, state.costs.activities, state.costs.expenses);
  var el = document.querySelector('#overviewSpent');
  if (el) el.textContent = fmtTotals(all);
}

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

}

async function loadTripItems(tripId) {
  state.costs = { transports: {}, stays: {}, activities: {}, expenses: {} };
  const tables = [
    { table: "trip_transports", render: (items) => { renderTransports(items); renderCruises(items); } },
    { table: "trip_stays", render: renderStays },
    { table: "trip_itinerary", render: renderItinerary },
    { table: "trip_activities", render: renderActivities },
    { table: "trip_expenses", render: renderExpenses },
    { table: "trip_notes", render: renderNotes }
  ];
  const allData = {};
  for (const { table, render } of tables) {
    const { data } = await supabase.from(table).select("*").eq("trip_id", tripId).order("created_at");
    allData[table] = data || [];
    render(data || []);
  }
  updateGlobalSpent();
  // Gantt
  renderGantt(
    allData["trip_transports"],
    allData["trip_stays"],
    allData["trip_activities"],
    allData["trip_itinerary"]
  );
  // Mapas con alfileres (async, no bloquea UI)
  updateMaps(tripId);
}

// ============================================================
// CRUD ITEMS — eliminar y editar
// ============================================================
async function deleteItem(table, id) {
  if (!confirm("¿Eliminar este elemento?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return alert(error.message);
  loadTripItems(state.selectedTripId);
}

function itemActions(table, id, editFn) {
  return `<div class="item-actions">
    <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;" onclick="${editFn}('${id}')">
      <i class="fa-solid fa-pen"></i>
    </button>
    <button class="btn btn-ghost danger" style="padding:5px 10px;font-size:12px;" onclick="deleteItem('${table}','${id}')">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>`;
}

// ============================================================
// TRANSPORTE — ida y vuelta + escalas dinámicas
// ============================================================
let stopCount = 0;

function toggleReturnLeg(val) {
  const ids = ['returnLegHeader','retOriginLabel','retDestLabel','retDepLabel','retArrLabel'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', val !== '1');
  });
  if (val === '1') {
    setTimeout(() => {
      // Pre-fill vuelta con el inverso de ida
      const orig = document.getElementById('originInput');
      const dest = document.getElementById('destInput');
      const retOrig = document.getElementById('retOriginInput');
      const retDest = document.getElementById('retDestInput');
      if (dest && retOrig && !retOrig.value) retOrig.value = dest.value;
      if (orig && retDest && !retDest.value) retDest.value = orig.value;
      // Inicializar autocomplete en los inputs de vuelta
      setupAutocomplete('retOriginInput', 'retOriginList');
      setupAutocomplete('retDestInput', 'retDestList');
      initFlatpickr();
    }, 60);
  }
}

function addStop() {
  stopCount++;
  const idx = stopCount;
  const container = document.getElementById('stopsContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'stop-block';
  div.id = `stop_${idx}`;
  div.innerHTML = `
    <div class="stop-header">
      <span class="eyebrow" style="color:var(--gold)"><i class="fa-solid fa-rotate"></i> Escala ${idx}</span>
      <button type="button" class="btn btn-ghost danger" style="padding:4px 8px;font-size:12px;" onclick="removeStop(${idx})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="form-grid compact-grid" style="margin-top:8px;">
      <label>Ciudad de escala
        <div class="autocomplete-wrap">
          <input name="stop_${idx}_city" id="stopCity_${idx}" autocomplete="off" placeholder="Ej: São Paulo" />
          <ul class="autocomplete-list hidden" id="stopCityList_${idx}"></ul>
        </div>
      </label>
      <label>Aeropuerto / Terminal<input name="stop_${idx}_terminal" placeholder="Ej: GRU - Guarulhos" /></label>
      <label>Llegada escala<input type="text" class="fpdatetime" name="stop_${idx}_arrival" placeholder="Fecha y hora" /></label>
      <label>Salida escala<input type="text" class="fpdatetime" name="stop_${idx}_departure" placeholder="Fecha y hora" /></label>
    </div>`;
  container.appendChild(div);
  setupAutocomplete(`stopCity_${idx}`, `stopCityList_${idx}`);
  initFlatpickr();
}

function removeStop(idx) {
  const el = document.getElementById(`stop_${idx}`);
  if (el) el.remove();
}

function renderStops(stopsJson) {
  try {
    const stops = JSON.parse(stopsJson);
    if (!stops.length) return '';
    return `<div class="stops-list">${stops.map((s, i) => `
      <div class="stop-item">
        <i class="fa-solid fa-rotate" style="color:var(--gold);"></i>
        <span>Escala ${i+1}: <strong>${s.city}</strong>${s.terminal ? ` (${s.terminal})` : ''}${s.arrival ? ` · Llega ${fmtDate(s.arrival)}` : ''}${s.departure ? ` · Sale ${fmtDate(s.departure)}` : ''}</span>
      </div>`).join('')}</div>`;
  } catch(e) { return ''; }
}

async function saveTransportForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());
  // Collect stops
  const stops = [];
  let si = 1;
  while (d[`stop_${si}_city`] !== undefined) {
    if (d[`stop_${si}_city`]) stops.push({
      city: d[`stop_${si}_city`],
      terminal: d[`stop_${si}_terminal`] || '',
      arrival: d[`stop_${si}_arrival`] || '',
      departure: d[`stop_${si}_departure`] || ''
    });
    si++;
  }
  const isRoundTrip = parseInt(d.round_trip) === 1;
  const payload = {
    trip_id: state.selectedTripId,
    type: d.type, round_trip: d.round_trip || 0,
    origin: d.origin, destination: d.destination,
    departure: d.departure || null, arrival: d.arrival || null,
    company: d.company || null, reference: d.reference || null,
    cost: d.cost ? parseFloat(d.cost) : null,
    currency: d.currency || 'USD', notes: d.notes || null,
    stops_count: stops.length,
    stops_data: stops.length ? JSON.stringify(stops) : null,
    return_origin: isRoundTrip ? (d.return_origin || d.destination || null) : null,
    return_destination: isRoundTrip ? (d.return_destination || d.origin || null) : null,
    return_departure: isRoundTrip ? (d.return_departure || null) : null,
    return_arrival: isRoundTrip ? (d.return_arrival || null) : null
  };
  const editId = form.dataset.editId;
  let error;
  if (editId) {
    const { trip_id, ...upd } = payload;
    ({ error } = await supabase.from('trip_transports').update(upd).eq('id', editId));
    delete form.dataset.editId;
  } else {
    ({ error } = await supabase.from('trip_transports').insert(payload));
  }
  if (error) return alert(error.message);


  stopCount = 0;
  const cont = document.getElementById('stopsContainer');
  if (cont) cont.innerHTML = '';
  const sel = document.getElementById('roundTripSelect');
  if (sel) { sel.value = '0'; toggleReturnLeg('0'); }
  const typeSelEl = document.querySelector('#transportForm [name="type"]');
  if (typeSelEl) toggleStayType(typeSelEl.value);
  closeAllModals(); form.reset(); loadTripItems(state.selectedTripId);
}

// Edit modals — cargar datos en el form y abrir modal
async function editTransport(id) {
  const { data } = await supabase.from("trip_transports").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#transportForm");
  fillForm(form, {
    type: data.type, origin: data.origin, destination: data.destination,
    departure: data.departure, arrival: data.arrival, company: data.company,
    reference: data.reference, cost: data.cost, currency: data.currency,
    notes: data.notes, round_trip: data.round_trip || 0,
    return_origin: data.return_origin || '',
    return_destination: data.return_destination || '',
    return_departure: data.return_departure || '',
    return_arrival: data.return_arrival || ''
  });
  form.dataset.editId = id;
  openModal("transportModal");
  setTimeout(() => {
    const sel = document.getElementById('roundTripSelect');
    if (sel) { sel.value = data.round_trip || 0; toggleReturnLeg(String(data.round_trip || 0)); }
    stopCount = 0;
    const cont = document.getElementById('stopsContainer');
    if (cont) cont.innerHTML = '';
    if (data.stops_data) {
      try { JSON.parse(data.stops_data).forEach(() => addStop()); } catch(e) {}
    }
  }, 80);
}

async function editStay(id) {
  const { data } = await supabase.from("trip_stays").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#stayForm");
  fillForm(form, { type: data.type, name: data.name, address: data.address,
    check_in: data.check_in, check_out: data.check_out, nights: data.nights,
    cost: data.cost, currency: data.currency, booking_link: data.booking_link, notes: data.notes });
  form.dataset.editId = id;
  openModal("stayModal");
}

async function editItinerary(id) {
  const { data } = await supabase.from("trip_itinerary").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#itineraryForm");
  fillForm(form, { date: data.date, time: data.time, place: data.place,
    title: data.title, priority: data.priority, status: data.status, description: data.description });
  form.dataset.editId = id;
  openModal("itineraryModal");
}

async function editActivity(id) {
  const { data } = await supabase.from("trip_activities").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#activityForm");
  fillForm(form, { name: data.name, date: data.date, time: data.time, place: data.place,
    provider: data.provider, cost: data.cost, currency: data.currency,
    people: data.people, booking_status: data.booking_status, notes: data.notes });
  form.dataset.editId = id;
  openModal("activityModal");
}

async function editExpense(id) {
  const { data } = await supabase.from("trip_expenses").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#expenseForm");
  fillForm(form, { concept: data.concept, category: data.category, amount: data.amount,
    currency: data.currency, date: data.date, payment_method: data.payment_method, notes: data.notes });
  form.dataset.editId = id;
  openModal("expenseModal");
}

async function editNote(id) {
  const { data } = await supabase.from("trip_notes").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.querySelector("#noteForm");
  fillForm(form, { title: data.title, type: data.type, content: data.content });
  form.dataset.editId = id;
  openModal("noteModal");
}

function fillForm(form, data) {
  Object.entries(data).forEach(([k, v]) => {
    const el = form.querySelector(`[name="${k}"]`);
    if (el && v !== null && v !== undefined) el.value = v;
  });
}

async function saveTripItem(table, form, extraFields) {
  const d = Object.fromEntries(new FormData(form).entries());
  const payload = Object.assign({}, d, extraFields || {}, { trip_id: state.selectedTripId });
  const editId = form.dataset.editId;
  let error;
  if (editId) {
    delete payload.trip_id;
    ({ error } = await supabase.from(table).update(payload).eq("id", editId));
    delete form.dataset.editId;
  } else {
    ({ error } = await supabase.from(table).insert(payload));
  }
  if (error) return alert(error.message);
  closeAllModals(); form.reset(); loadTripItems(state.selectedTripId);
}

function renderTransports(items) {
  const el = $("#transportList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay tramos de transporte aún."); return; }
  const nonCruise = items.filter(i => i.type !== 'crucero');
  state.costs.transports = sumCosts(nonCruise);
  el.innerHTML = nonCruise.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <div><h4>${i.origin || '?'} → ${i.destination || '?'}</h4></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge">${i.type}</span>
          ${itemActions("trip_transports", i.id, "editTransport")}
        </div>
      </div>
      <div class="item-meta">
        ${i.departure ? `<span><i class="fa-solid fa-plane-departure"></i> ${fmtDate(i.departure)}</span>` : ""}
        ${i.arrival ? `<span><i class="fa-solid fa-plane-arrival"></i> ${fmtDate(i.arrival)}</span>` : ""}
        ${i.company ? `<span><i class="fa-solid fa-building"></i> ${i.company}</span>` : ""}
        ${i.reference ? `<span><i class="fa-solid fa-barcode"></i> ${i.reference}</span>` : ""}
        <span class="badge" style="background:rgba(96,165,250,0.1);color:#60a5fa;border-color:rgba(96,165,250,0.2);">
          ${parseInt(i.round_trip) === 1 ? '✈↩ Ida y vuelta' : '✈ Solo ida'}
        </span>
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${parseFloat(i.cost).toFixed(2)}</span>` : ""}
      </div>
      ${i.notes ? `<p class="item-notes">${i.notes}</p>` : ""}
      ${i.stops_data ? renderStops(i.stops_data) : ""}
      ${parseInt(i.round_trip) === 1 && i.return_origin ? `
        <div class="return-leg">
          <span class="eyebrow" style="color:var(--gold);font-size:10px;"><i class="fa-solid fa-plane-arrival"></i> Vuelta: ${i.return_origin} → ${i.return_destination || ''}</span>
          ${i.return_departure ? `<p class="item-notes" style="margin:2px 0 0;">${fmtDate(i.return_departure)}</p>` : ""}
        </div>` : ""}
    </div>
  `).join("") + subtotalBar(state.costs.transports, "Subtotal transporte");
}

function mapsLink(address) {
  if (!address) return '';
  const enc = encodeURIComponent(address);
  return `<div class="map-links">
    <a href="https://www.google.com/maps/search/?api=1&query=${enc}" target="_blank" class="map-link"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>
    <a href="https://waze.com/ul?q=${enc}" target="_blank" class="map-link"><i class="fa-solid fa-diamond-turn-right"></i> Waze</a>
  </div>`;
}

function renderStays(items) {
  const el = $("#stayList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay alojamientos aún."); return; }
  state.costs.stays = sumCosts(items);
  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <div><h4>${i.name}</h4>${i.address ? `<p class="muted" style="margin:2px 0 0;font-size:13px;">${i.address}</p>` : ""}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge">${i.type}</span>
          ${itemActions("trip_stays", i.id, "editStay")}
        </div>
      </div>
      <div class="item-meta">
        ${i.check_in ? `<span><i class="fa-solid fa-right-to-bracket"></i> ${fmtDate(i.check_in)}</span>` : ""}
        ${i.check_out ? `<span><i class="fa-solid fa-right-from-bracket"></i> ${fmtDate(i.check_out)}</span>` : ""}
        ${i.nights ? `<span><i class="fa-solid fa-moon"></i> ${i.nights} noches</span>` : ""}
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${parseFloat(i.cost).toFixed(2)}</span>` : ""}
      </div>
      ${i.address ? mapsLink(i.address) : ""}
      ${i.booking_link ? `<a href="${i.booking_link}" target="_blank" class="map-link" style="margin-top:6px;"><i class="fa-solid fa-link"></i> Ver reserva</a>` : ""}
    </div>
  `).join("") + subtotalBar(state.costs.stays, "Subtotal alojamiento");
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
  const today = new Date(); today.setHours(0,0,0,0);
  el.innerHTML = Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b)).map(([day, acts]) => {
    const dayDate = new Date(day);
    const isPast = day !== "Sin fecha" && dayDate < today;
    const isToday = day !== "Sin fecha" && dayDate.toDateString() === today.toDateString();
    return `
    <div class="day-block ${isPast?'day-past':''} ${isToday?'day-today':''}">
      <div class="day-header">
        <strong>${fmtDate(day)}</strong>
        ${isToday ? '<span class="badge" style="background:rgba(45,212,191,0.2);color:var(--teal)">Hoy</span>' : ''}
        ${isPast ? '<span class="badge" style="color:var(--muted)">Pasado</span>' : ''}
      </div>
      <div class="day-timeline">
        ${acts.map(a => `
          <div class="timeline-item ${isPast?'timeline-past':''}">
            <span class="timeline-time">${a.time || "--:--"}</span>
            <div class="timeline-content" style="flex:1;">
              <h4>${a.title}</h4>
              <p>${a.place || ""} ${a.description || ""}</p>
              ${a.place ? mapsLink(a.place) : ""}
            </div>
            ${itemActions("trip_itinerary", a.id, "editItinerary")}
          </div>
        `).join("")}
      </div>
    </div>`;
  }).join("");
}

// ============================================================
// GANTT DEL ITINERARIO
// ============================================================

function renderGantt(transports, stays, activities, itinerary) {
  const ganttEl = document.querySelector('#ganttContainer');
  if (!ganttEl) return;

  // Juntar todos los eventos con fecha
  const events = [];

  (transports || []).forEach(t => {
    const typeIcon = t.type === 'crucero' ? '🚢' : t.type === 'tren' ? '🚆' : t.type === 'auto' ? '🚗' : t.type === 'bus' ? '🚌' : '✈';
    if (t.departure) events.push({
      date: t.departure.split('T')[0],
      endDate: t.arrival ? t.arrival.split('T')[0] : t.departure.split('T')[0],
      label: `${typeIcon} ${t.origin || ''} → ${t.destination || ''}`,
      type: 'transport', time: t.departure.split('T')[1]?.slice(0,5) || ''
    });
    // Add return leg if round trip
    if (parseInt(t.round_trip) === 1 && t.return_departure) {
      events.push({
        date: t.return_departure.split('T')[0],
        endDate: t.return_arrival ? t.return_arrival.split('T')[0] : t.return_departure.split('T')[0],
        label: `${typeIcon} ${t.return_origin || t.destination || ''} → ${t.return_destination || t.origin || ''} (vuelta)`,
        type: 'transport', time: t.return_departure.split('T')[1]?.slice(0,5) || ''
      });
    }
  });

  (stays || []).forEach(s => {
    if (s.check_in) events.push({
      date: s.check_in, endDate: s.check_out || s.check_in,
      label: `🏨 ${s.name}`,
      type: 'stay', time: ''
    });
  });

  (activities || []).forEach(a => {
    if (a.date) events.push({
      date: a.date, endDate: a.date,
      label: `🎯 ${a.name}`,
      type: 'activity', time: a.time || ''
    });
  });

  (itinerary || []).forEach(i => {
    if (i.date) events.push({
      date: i.date, endDate: i.date,
      label: `📍 ${i.title}`,
      type: 'itinerary', time: i.time || ''
    });
  });

  if (!events.length) {
    ganttEl.innerHTML = '<p class="muted" style="padding:20px 0;">Agregá fechas a tus actividades para ver el Gantt.</p>';
    return;
  }

  // Calcular rango de fechas
  const allDates = events.flatMap(e => [e.date, e.endDate]).filter(Boolean).sort();
  const minDate = new Date(allDates[0]);
  const maxDate = new Date(allDates[allDates.length - 1]);
  const today = new Date(); today.setHours(0,0,0,0);
  const totalDays = Math.max(Math.round((maxDate - minDate) / 86400000) + 1, 1);

  // Generar cabecera de días
  const days = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const typeColors = {
    transport: '#2dd4bf', stay: '#c9a84c',
    activity: '#a78bfa', itinerary: '#60a5fa'
  };

  const dayLabels = days.map(d => {
    const isToday = d.toDateString() === today.toDateString();
    const label = d.toLocaleDateString('es-AR', { day:'2-digit', month:'short' });
    return `<div class="gantt-day-label ${isToday ? 'gantt-today-label' : ''}">${label}</div>`;
  }).join('');

  const rows = events.sort((a,b) => a.date.localeCompare(b.date)).map(ev => {
    const start = Math.round((new Date(ev.date) - minDate) / 86400000);
    const duration = Math.max(Math.round((new Date(ev.endDate) - new Date(ev.date)) / 86400000) + 1, 1);
    const pct = (start / (totalDays + 1)) * 100;
    const width = (duration / (totalDays + 1)) * 100;
    const isPast = new Date(ev.endDate) < today;
    const color = typeColors[ev.type];

    return `
      <div class="gantt-row">
        <div class="gantt-label">${ev.time ? `<span class="gantt-time">${ev.time}</span>` : ''}${ev.label}</div>
        <div class="gantt-bar-track">
          <div class="gantt-bar ${isPast ? 'gantt-bar-past' : ''}"
            style="left:${pct.toFixed(2)}%;width:${width.toFixed(2)}%;background:${color};">
          </div>
        </div>
      </div>`;
  }).join('');

  // Línea de hoy
  const todayOffset = Math.round((today - minDate) / 86400000);
  const todayPct = todayOffset >= 0 && todayOffset <= totalDays
    ? (todayOffset / (totalDays + 1)) * 100 : null;

  ganttEl.innerHTML = `
    <div class="gantt-wrap">
      <div class="gantt-header">
        <div class="gantt-label-head">Actividad</div>
        <div class="gantt-days-head">${dayLabels}</div>
      </div>
      <div class="gantt-body" style="position:relative;">
        ${todayPct !== null ? `<div class="gantt-today-line" style="left:calc(180px + ${todayPct.toFixed(2)}% * (100% - 180px) / 100)"></div>` : ''}
        ${rows}
      </div>
    </div>
    <div class="gantt-legend">
      <span><span class="legend-dot" style="background:#2dd4bf"></span>Transporte</span>
      <span><span class="legend-dot" style="background:#c9a84c"></span>Alojamiento</span>
      <span><span class="legend-dot" style="background:#a78bfa"></span>Excursiones</span>
      <span><span class="legend-dot" style="background:#60a5fa"></span>Itinerario</span>
      <span><span class="legend-dot" style="background:rgba(255,255,255,0.2)"></span>Pasado</span>
    </div>`;
}

function renderActivities(items) {
  const el = $("#activityList");
  if (!items.length) { el.innerHTML = emptyMsg("No hay excursiones aún."); return; }
  state.costs.activities = sumCosts(items);
  const today = new Date(); today.setHours(0,0,0,0);
  el.innerHTML = items.map(i => {
    const isPast = i.date && new Date(i.date) < today;
    return `
    <div class="item-card ${isPast?'item-past':''}">
      <div class="item-card-top">
        <h4>${i.name}</h4>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge">${i.booking_status || "pendiente"}</span>
          ${itemActions("trip_activities", i.id, "editActivity")}
        </div>
      </div>
      <div class="item-meta">
        ${i.date ? `<span><i class="fa-solid fa-calendar"></i> ${fmtDate(i.date)}</span>` : ""}
        ${i.time ? `<span><i class="fa-solid fa-clock"></i> ${i.time}</span>` : ""}
        ${i.place ? `<span><i class="fa-solid fa-location-dot"></i> ${i.place}</span>` : ""}
        ${i.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${i.currency} ${parseFloat(i.cost).toFixed(2)}</span>` : ""}
        ${isPast ? '<span style="color:var(--muted);font-size:12px;">Pasado</span>' : ''}
      </div>
      ${i.place ? mapsLink(i.place) : ""}
    </div>`;
  }).join("") + subtotalBar(state.costs.activities, "Subtotal excursiones");
}

function renderExpenses(items) {
  const el = $("#expenseList");
  const summaryEl = $("#expenseSummary");
  if (!items.length) { el.innerHTML = emptyMsg("Sin gastos extras cargados."); summaryEl.innerHTML = ""; return; }

  state.costs.expenses = sumCosts(items, "amount", "currency");

  el.innerHTML = items.map(i => `
    <div class="item-card">
      <div class="item-card-top">
        <div><h4>${i.concept}</h4></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <strong>${i.currency} ${parseFloat(i.amount).toFixed(2)}</strong>
          ${itemActions("trip_expenses", i.id, "editExpense")}
        </div>
      </div>
      <div class="item-meta">
        <span class="badge">${i.category}</span>
        ${i.date ? `<span><i class="fa-solid fa-calendar"></i> ${fmtDate(i.date)}</span>` : ""}
        ${i.payment_method ? `<span><i class="fa-solid fa-credit-card"></i> ${i.payment_method}</span>` : ""}
      </div>
    </div>
  `).join("") + subtotalBar(state.costs.expenses, "Subtotal gastos extras");

  summaryEl.innerHTML = Object.entries(state.costs.expenses).map(([cur, total]) => `
    <div class="summary-item"><span>${cur}</span><strong>${total.toFixed(2)}</strong></div>
  `).join("");
}

function renderNotes(items) {
  const el = $("#noteList");
  if (!items.length) { el.innerHTML = emptyMsg("Sin notas."); return; }
  el.innerHTML = items.map(i => `
    <div class="note-card">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
        <h4>${i.title}</h4>
        ${itemActions("trip_notes", i.id, "editNote")}
      </div>
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
    const author = post._username || "Viajero";
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
    rankingSection: "Ranking",
    calculadoraSection: "Calculadora de cambio",
    profileSection: "Mi perfil"
  };
  $("#pageTitle").textContent = titles[sectionId] || "";

  const createBtn = $("#createTripBtn");
  createBtn.style.display = sectionId === "dashboardSection" ? "inline-flex" : "none";

  if (sectionId === "communitySection") loadForum();
  if (sectionId === "rankingSection") loadRanking('all');
  if (sectionId === "calculadoraSection") loadCotizaciones();
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");
  loadTrips();
  // El foro se carga en communitySection cuando navegás
}

// ============================================================
// MAPAS (Leaflet) — con alfileres y líneas
// ============================================================

const initializedMaps = {};
const mapLayers = {}; // track markers/lines per map

function initMap(id) {
  const el = $(`#${id}`);
  if (!el || initializedMaps[id]) return;
  initializedMaps[id] = L.map(id, { zoomControl: true }).setView([-34.6, -58.4], 3);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "© OpenStreetMap © CartoDB",
    maxZoom: 19
  }).addTo(initializedMaps[id]);
  mapLayers[id] = [];
}

function clearMapLayers(mapId) {
  const map = initializedMaps[mapId];
  if (!map) return;
  (mapLayers[mapId] || []).forEach(layer => map.removeLayer(layer));
  mapLayers[mapId] = [];
}

function addMarker(mapId, lat, lon, label, color, popupHtml) {
  const map = initializedMaps[mapId];
  if (!map) return null;
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 0 8px ${color};
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
  const marker = L.marker([lat, lon], { icon });
  if (popupHtml) {
    marker.bindPopup(`<div style="font-family:DM Sans,sans-serif;font-size:13px;color:#0c1628;min-width:140px;">${popupHtml}</div>`);
  }
  marker.addTo(map);
  mapLayers[mapId].push(marker);
  return marker;
}

function addPolyline(mapId, coords, color) {
  const map = initializedMaps[mapId];
  if (!map || coords.length < 2) return;
  const line = L.polyline(coords, {
    color: color,
    weight: 2,
    opacity: 0.7,
    dashArray: '6,8'
  }).addTo(map);
  mapLayers[mapId].push(line);
}

// Colores por tipo de lugar
const PIN_COLORS = {
  transport: '#2dd4bf',
  stay: '#c9a84c',
  activity: '#a78bfa',
  itinerary: '#60a5fa'
};

async function updateMaps(tripId) {
  // Traer datos para pintar
  const [transRes, stayRes, actRes, itinRes] = await Promise.all([
    supabase.from('trip_transports').select('origin,destination,type').eq('trip_id', tripId),
    supabase.from('trip_stays').select('name,address').eq('trip_id', tripId),
    supabase.from('trip_activities').select('name,place').eq('trip_id', tripId),
    supabase.from('trip_itinerary').select('title,place,date').eq('trip_id', tripId)
  ]);

  const allCoords = [];

  for (const mapId of ['miniMap', 'fullMap']) {
    if (!initializedMaps[mapId]) continue;
    clearMapLayers(mapId);

    // Transportes: alfileres en origen/destino + línea
    for (const t of (transRes.data || [])) {
      const [c1, c2] = await Promise.all([getCoords(t.origin), getCoords(t.destination)]);
      if (c1) {
        addMarker(mapId, c1.lat, c1.lon, t.origin, PIN_COLORS.transport,
          `<strong>✈ Origen</strong><br>${t.origin}`);
        allCoords.push([c1.lat, c1.lon]);
      }
      if (c2) {
        addMarker(mapId, c2.lat, c2.lon, t.destination, PIN_COLORS.transport,
          `<strong>✈ Destino</strong><br>${t.destination}`);
        allCoords.push([c2.lat, c2.lon]);
      }
      if (c1 && c2) addPolyline(mapId, [[c1.lat,c1.lon],[c2.lat,c2.lon]], PIN_COLORS.transport);
      await new Promise(r => setTimeout(r, 100));
    }

    // Alojamientos
    for (const s of (stayRes.data || [])) {
      const addr = s.address || s.name;
      const c = await getCoords(addr);
      if (c) {
        addMarker(mapId, c.lat, c.lon, s.name, PIN_COLORS.stay,
          `<strong>🏨 ${s.name}</strong><br>${s.address || ''}`);
        allCoords.push([c.lat, c.lon]);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    // Excursiones
    for (const a of (actRes.data || [])) {
      if (!a.place) continue;
      const c = await getCoords(a.place);
      if (c) {
        addMarker(mapId, c.lat, c.lon, a.name, PIN_COLORS.activity,
          `<strong>🎯 ${a.name}</strong><br>${a.place}`);
        allCoords.push([c.lat, c.lon]);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    // Itinerario
    for (const i of (itinRes.data || [])) {
      if (!i.place) continue;
      const c = await getCoords(i.place);
      if (c) {
        addMarker(mapId, c.lat, c.lon, i.title, PIN_COLORS.itinerary,
          `<strong>📍 ${i.title}</strong><br>${i.place}<br><small>${fmtDate(i.date)}</small>`);
        allCoords.push([c.lat, c.lon]);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    // Ajustar zoom a todos los puntos
    if (allCoords.length > 0) {
      try {
        initializedMaps[mapId].fitBounds(allCoords, { padding: [30, 30] });
      } catch(e) {}
    }
  }

  // Leyenda
  const legend = `
    <div class="map-legend">
      <span><span class="legend-dot" style="background:${PIN_COLORS.transport}"></span>Transporte</span>
      <span><span class="legend-dot" style="background:${PIN_COLORS.stay}"></span>Alojamiento</span>
      <span><span class="legend-dot" style="background:${PIN_COLORS.activity}"></span>Excursión</span>
      <span><span class="legend-dot" style="background:${PIN_COLORS.itinerary}"></span>Itinerario</span>
    </div>`;
  ['miniMap','fullMap'].forEach(id => {
    const el = document.querySelector(`#${id}`);
    if (el && !el.querySelector('.map-legend')) el.insertAdjacentHTML('afterend', legend);
  });
}

// ============================================================
// MODALES
// ============================================================

function openModal(id) {
  $("#modalBackdrop").classList.remove("hidden");
  $(`#${id}`).classList.remove("hidden");
  setTimeout(() => {
    initFlatpickr();
    initAutocompletes();
    // Hook transport type select

  }, 60);
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
  // Si es solo fecha (YYYY-MM-DD), parseamos sin timezone para evitar el desfase de un día
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  }
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

// ============================================================
// CRUCERO / TRAVESÍA
// ============================================================
let cruiseStopCount = 0;

function toggleCruiseStay(checked) {
  // Just visual feedback, always auto-creates stay if checked
}

function addCruiseStop() {
  cruiseStopCount++;
  const idx = cruiseStopCount;
  const container = document.getElementById('cruiseStopsContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'stop-block';
  div.id = `cruiseStop_${idx}`;
  div.innerHTML = `
    <div class="stop-header">
      <span class="eyebrow" style="color:var(--gold)"><i class="fa-solid fa-anchor"></i> Puerto ${idx}</span>
      <button type="button" class="btn btn-ghost danger" style="padding:4px 8px;font-size:12px;" onclick="removeCruiseStop(${idx})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="form-grid compact-grid" style="margin-top:8px;">
      <label>Puerto / Ciudad
        <div class="autocomplete-wrap">
          <input name="cruise_stop_${idx}_city" id="cruiseStopCity_${idx}" autocomplete="off" placeholder="Ej: Nápoles" />
          <ul class="autocomplete-list hidden" id="cruiseStopCityList_${idx}"></ul>
        </div>
      </label>
      <label>Llegada<input type="text" class="fpdatetime" name="cruise_stop_${idx}_arrival" placeholder="Fecha y hora" /></label>
      <label>Salida<input type="text" class="fpdatetime" name="cruise_stop_${idx}_departure" placeholder="Fecha y hora" /></label>
      <label>Notas<input name="cruise_stop_${idx}_notes" placeholder="Excursión, libre, etc." /></label>
    </div>`;
  container.appendChild(div);
  setupAutocomplete(`cruiseStopCity_${idx}`, `cruiseStopCityList_${idx}`);
  initFlatpickr();
}

function removeCruiseStop(idx) {
  const el = document.getElementById(`cruiseStop_${idx}`);
  if (el) el.remove();
}

async function saveCruiseForm(form) {
  const d = Object.fromEntries(new FormData(form).entries());

  // Validate dates
  if (d.departure && d.arrival && d.arrival < d.departure) {
    const err = document.getElementById('cruiseDateError');
    if (err) { err.textContent = '⚠️ La fecha de regreso no puede ser antes del zarpe.'; err.classList.remove('hidden'); }
    return;
  }

  // Collect port stops
  const portStops = [];
  let pi = 1;
  while (d[`cruise_stop_${pi}_city`] !== undefined) {
    if (d[`cruise_stop_${pi}_city`]) portStops.push({
      city: d[`cruise_stop_${pi}_city`],
      arrival: d[`cruise_stop_${pi}_arrival`] || '',
      departure: d[`cruise_stop_${pi}_departure`] || '',
      notes: d[`cruise_stop_${pi}_notes`] || ''
    });
    pi++;
  }

  // Save as transport type "crucero"
  const payload = {
    trip_id: state.selectedTripId,
    type: 'crucero',
    origin: d.departure_port,
    destination: d.arrival_port || d.departure_port,
    departure: d.departure || null,
    arrival: d.arrival || null,
    company: d.company || null,
    cost: d.cost ? parseFloat(d.cost) : null,
    currency: d.currency || 'USD',
    notes: d.notes || null,
    stops_count: portStops.length,
    stops_data: portStops.length ? JSON.stringify(portStops) : null,
    round_trip: 0
  };

  const { error } = await supabase.from('trip_transports').insert(payload);
  if (error) return alert(error.message);

  // Auto-create stay if includes_stay checked
  if (d.includes_stay === '1') {
    const nights = d.departure && d.arrival
      ? Math.round((new Date(d.arrival) - new Date(d.departure)) / 86400000) : null;
    await supabase.from('trip_stays').insert({
      trip_id: state.selectedTripId,
      type: 'barco',
      name: `🚢 ${d.name}`,
      address: `${d.departure_port}${d.arrival_port && d.arrival_port !== d.departure_port ? ' → ' + d.arrival_port : ''}`,
      check_in: d.departure ? d.departure.split('T')[0] : null,
      check_out: d.arrival ? d.arrival.split('T')[0] : null,
      nights,
      cost: d.cost ? parseFloat(d.cost) : null,
      currency: d.currency || 'USD',
      notes: `🚢 Alojamiento a bordo — ${d.name}. ${d.notes || ''}`
    });
  }

  cruiseStopCount = 0;
  const cont = document.getElementById('cruiseStopsContainer');
  if (cont) cont.innerHTML = '';
  closeAllModals(); form.reset(); loadTripItems(state.selectedTripId);
}

function renderCruises(items) {
  const el = document.getElementById('cruiseList');
  if (!el) return;
  const cruises = items.filter(i => i.type === 'crucero');
  if (!cruises.length) { el.innerHTML = ''; return; }
  el.innerHTML = cruises.map(c => {
    const portStops = c.stops_data ? (() => { try { return JSON.parse(c.stops_data); } catch(e) { return []; } })() : [];
    return `
    <div class="item-card cruise-card">
      <div class="item-card-top">
        <div>
          <h4>🚢 ${c.company ? c.company + ' — ' : ''}${c.origin || ''}${c.destination && c.destination !== c.origin ? ' → ' + c.destination : ' (circuito)'}</h4>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge" style="background:rgba(96,165,250,0.1);color:#60a5fa;">crucero</span>
          ${itemActions("trip_transports", c.id, "editCruise")}
        </div>
      </div>
      <div class="item-meta">
        ${c.departure ? `<span><i class="fa-solid fa-ship"></i> Zarpe: ${fmtDate(c.departure)}</span>` : ''}
        ${c.arrival ? `<span><i class="fa-solid fa-anchor"></i> Regreso: ${fmtDate(c.arrival)}</span>` : ''}
        ${c.cost ? `<span><i class="fa-solid fa-dollar-sign"></i> ${c.currency} ${parseFloat(c.cost).toFixed(2)}</span>` : ''}
      </div>
      ${portStops.length ? `<div class="stops-list" style="margin-top:8px;">${portStops.map((p,i) => `
        <div class="stop-item"><i class="fa-solid fa-anchor" style="color:var(--gold);"></i>
          <span>Puerto ${i+1}: <strong>${p.city}</strong>${p.arrival ? ` · Llega ${fmtDate(p.arrival)}` : ''}${p.departure ? ` · Sale ${fmtDate(p.departure)}` : ''}${p.notes ? ` — ${p.notes}` : ''}</span>
        </div>`).join('')}</div>` : ''}
      ${c.notes ? `<p class="item-notes">${c.notes}</p>` : ''}
    </div>`;
  }).join('');
}

async function editCruise(id) {
  const { data } = await supabase.from('trip_transports').select('*').eq('id', id).single();
  if (!data) return;
  const form = document.querySelector('#cruiseForm');
  fillForm(form, {
    name: (data.company ? '' : ''), company: data.company || '',
    departure_port: data.origin || '', arrival_port: data.destination || '',
    departure: data.departure || '', arrival: data.arrival || '',
    cost: data.cost || '', currency: data.currency || 'USD', notes: data.notes || ''
  });
  form.dataset.editId = id;
  cruiseStopCount = 0;
  const cont = document.getElementById('cruiseStopsContainer');
  if (cont) cont.innerHTML = '';
  if (data.stops_data) {
    try { JSON.parse(data.stops_data).forEach(() => addCruiseStop()); } catch(e) {}
  }
  openModal('cruiseModal');
}

// ============================================================
// CALCULADORA DE CAMBIO — DolarApi.ar
// ============================================================

let dolarData = [];
let calcDirection = 'ars-usd';

const DOLAR_NOMBRES = {
  'oficial':         '🏛 Oficial',
  'blue':            '💵 Blue',
  'bolsa':           '📈 Bolsa (MEP)',
  'contadoconliqui': '🔄 CCL',
  'tarjeta':         '💳 Tarjeta (+impuestos)',
  'cripto':          '🪙 Cripto (CCB)',
  'mayorista':       '🏦 Mayorista',
};

async function loadCotizaciones() {
  const tableEl = document.getElementById('calcCompareTable');
  const selectEl = document.getElementById('calcExchange');
  if (!tableEl || !selectEl) return;

  tableEl.innerHTML = '<p class="muted" style="padding:12px 0;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</p>';

  try {
    const res = await fetch('https://dolarapi.com/v1/dolares');
    const data = await res.json();
    dolarData = data;

    selectEl.innerHTML = data.map(d =>
      `<option value="${d.nombre}">${DOLAR_NOMBRES[d.nombre] || d.casa} — Venta $${(d.venta||d.compra||0).toLocaleString('es-AR')}</option>`
    ).join('');

    const now = new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
    tableEl.innerHTML = `
      <table class="calc-table">
        <thead><tr><th>Tipo</th><th>Compra</th><th>Venta</th></tr></thead>
        <tbody>
          ${data.map((d, i) => {
            const nombre = DOLAR_NOMBRES[d.nombre] || d.casa;
            const compra = d.compra ? `$${d.compra.toLocaleString('es-AR', {minimumFractionDigits:2})}` : '—';
            const venta  = d.venta  ? `$${d.venta.toLocaleString('es-AR',  {minimumFractionDigits:2})}` : '—';
            const isBlue = d.nombre === 'blue';
            return `<tr class="${isBlue ? 'calc-table-best' : ''}">
              <td><strong>${isBlue ? '⭐ ' : ''}${nombre}</strong>${d.nombre === 'tarjeta' ? '<br><span style="font-size:11px;color:var(--muted);">Oficial + impuestos</span>' : ''}</td>
              <td class="calc-td-bid">${compra}</td>
              <td class="calc-td-ask">${venta}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="muted" style="font-size:11px;margin-top:10px;text-align:right;">
        Fuente: <a href="https://dolarapi.com" target="_blank" style="color:var(--teal);">DolarApi.com</a> · ${now}
      </p>`;

    calcConvert();
  } catch(err) {
    console.error('DolarApi error:', err);
    tableEl.innerHTML = `<p style="color:var(--danger);">Error cargando. Intentá de nuevo.</p>`;
  }
}

function setDirection(dir) {
  calcDirection = dir;
  document.getElementById('dirArsUsd').classList.toggle('active', dir === 'ars-usd');
  document.getElementById('dirUsdArs').classList.toggle('active', dir === 'usd-ars');
  document.getElementById('calcInputLabel').textContent = dir === 'ars-usd' ? 'Monto en ARS' : 'Monto en USD';
  document.getElementById('calcCurrencyBadge').textContent = dir === 'ars-usd' ? '$' : 'U$D';
  document.getElementById('calcResultLabel').textContent = dir === 'ars-usd' ? 'Resultado en USD' : 'Resultado en ARS';
  document.getElementById('calcAmount').placeholder = dir === 'ars-usd' ? '100000' : '100';
  calcConvert();
}

function calcConvert() {
  const amount = parseFloat(document.getElementById('calcAmount')?.value || 0);
  const selectedNombre = document.getElementById('calcExchange')?.value;
  const resultEl = document.getElementById('calcResultValue');
  const rateEl = document.getElementById('calcResultRate');
  if (!resultEl) return;

  const dolar = dolarData.find(d => d.nombre === selectedNombre);
  if (!amount || !dolar) {
    resultEl.textContent = '–';
    if (rateEl) rateEl.textContent = '';
    return;
  }

  let result, rate, rateLabel;
  if (calcDirection === 'ars-usd') {
    // Comprás USD → pagás el precio de venta
    rate = dolar.venta || dolar.compra || 0;
    result = rate > 0 ? amount / rate : 0;
    rateLabel = `Venta: $${rate.toLocaleString('es-AR', {minimumFractionDigits:2})} ARS/USD`;
    resultEl.textContent = result > 0 ? `U$D ${result.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '–';
  } else {
    // Vendés USD → te pagan el precio de compra
    rate = dolar.compra || dolar.venta || 0;
    result = rate * amount;
    rateLabel = `Compra: $${rate.toLocaleString('es-AR', {minimumFractionDigits:2})} ARS/USD`;
    resultEl.textContent = result > 0 ? `$${result.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '–';
  }
  if (rateEl) rateEl.textContent = rateLabel;
}

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
  // Transport has special handler for stops + return leg
  const tForm = document.querySelector("#transportForm");
  if (tForm) tForm.addEventListener("submit", e => { e.preventDefault(); saveTransportForm(e.target); });

  // Cruise form
  const cruiseFormEl = document.querySelector('#cruiseForm');
  if (cruiseFormEl) cruiseFormEl.addEventListener('submit', e => { e.preventDefault(); saveCruiseForm(e.target); });

  const tripItemForms = {
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


// ============================================================
// FLATPICKR — calendarios en todos los modales
// ============================================================
function initFlatpickr() {
  // Fechas solas
  document.querySelectorAll('.fpdate:not([data-fp])').forEach(el => {
    el.setAttribute('data-fp', '1');
    flatpickr(el, {
      dateFormat: 'Y-m-d',
      locale: 'es',
      allowInput: true,
      disableMobile: false
    });
  });
  // Fecha + hora
  document.querySelectorAll('.fpdatetime:not([data-fp])').forEach(el => {
    el.setAttribute('data-fp', '1');
    flatpickr(el, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      time_24hr: true,
      locale: 'es',
      allowInput: true,
      onReady: function(_, __, fp) {
        const btn = document.createElement('button');
        btn.textContent = '✓ Confirmar';
        btn.type = 'button';
        btn.style.cssText = 'width:100%;margin-top:8px;padding:10px;background:linear-gradient(135deg,#14b8a6,#2dd4bf);color:#061018;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;';
        btn.addEventListener('click', () => fp.close());
        fp.calendarContainer.appendChild(btn);
      }
    });
  });
  // Solo hora
  document.querySelectorAll('.fptime:not([data-fp])').forEach(el => {
    el.setAttribute('data-fp', '1');
    flatpickr(el, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'H:i',
      time_24hr: true,
      locale: 'es',
      allowInput: true
    });
  });

  // Validación: fecha fin no puede ser antes de inicio (modal viaje)
  const tripStart = document.querySelector('#tripStart');
  const tripEnd   = document.querySelector('#tripEnd');
  const tripErr   = document.querySelector('#tripDateError');
  if (tripStart && tripEnd) {
    const checkTrip = () => {
      if (tripStart.value && tripEnd.value && tripEnd.value < tripStart.value) {
        if (tripErr) { tripErr.textContent = '⚠️ La fecha de fin no puede ser anterior a la de inicio.'; tripErr.classList.remove('hidden'); }
        tripEnd.value = '';
        if (tripEnd._flatpickr) tripEnd._flatpickr.clear();
      } else {
        if (tripErr) tripErr.classList.add('hidden');
      }
    };
    tripStart.addEventListener('change', checkTrip);
    tripEnd.addEventListener('change', checkTrip);
  }

  // Validación check-in/check-out + noches automáticas
  const stayIn  = document.querySelector('#stayIn');
  const stayOut = document.querySelector('#stayOut');
  const stayN   = document.querySelector('#stayNights');
  const stayErr = document.querySelector('#stayDateError');
  if (stayIn && stayOut) {
    const checkStay = () => {
      if (stayIn.value && stayOut.value) {
        const diff = Math.round((new Date(stayOut.value) - new Date(stayIn.value)) / 86400000);
        if (diff < 0) {
          if (stayErr) { stayErr.textContent = '⚠️ El check-out no puede ser antes del check-in.'; stayErr.classList.remove('hidden'); }
          stayOut.value = '';
          if (stayOut._flatpickr) stayOut._flatpickr.clear();
          if (stayN) stayN.value = '';
        } else {
          if (stayErr) stayErr.classList.add('hidden');
          if (stayN) stayN.value = diff;
        }
      }
    };
    stayIn.addEventListener('change', checkStay);
    stayOut.addEventListener('change', checkStay);
  }

  // Validación salida/llegada transporte
  const tDep = document.querySelector('#tDep');
  const tArr = document.querySelector('#tArr');
  const tErr = document.querySelector('#transportDateError');
  if (tDep && tArr) {
    const checkT = () => {
      if (tDep.value && tArr.value && tArr.value < tDep.value) {
        if (tErr) { tErr.textContent = '⚠️ La llegada no puede ser antes de la salida.'; tErr.classList.remove('hidden'); }
        tArr.value = '';
        if (tArr._flatpickr) tArr._flatpickr.clear();
      } else {
        if (tErr) tErr.classList.add('hidden');
      }
    };
    tDep.addEventListener('change', checkT);
    tArr.addEventListener('change', checkT);
  }
}

// ============================================================
// NOMINATIM AUTOCOMPLETE — todos los campos de lugar
// ============================================================
let _nomTimer = null;

function setupAutocomplete(inputId, listId) {
  const input = document.querySelector('#' + inputId);
  const list  = document.querySelector('#' + listId);
  if (!input || !list || input._acSetup) return;
  input._acSetup = true;

  input.addEventListener('input', () => {
    clearTimeout(_nomTimer);
    const q = input.value.trim();
    if (q.length < 3) { list.classList.add('hidden'); return; }
    _nomTimer = setTimeout(async () => {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=es`);
        const data = await res.json();
        if (!data.length) { list.classList.add('hidden'); return; }
        list.innerHTML = data.map(p => {
          const name = p.display_name.split(',').slice(0, 3).join(', ');
          return `<li data-name="${name}">${name}</li>`;
        }).join('');
        list.classList.remove('hidden');
        list.querySelectorAll('li').forEach(li => {
          li.addEventListener('click', () => {
            input.value = li.dataset.name;
            list.classList.add('hidden');
            input.dispatchEvent(new Event('change'));
          });
        });
      } catch(e) { list.classList.add('hidden'); }
    }, 380);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add('hidden');
  });
}

function initAutocompletes() {
  setupAutocomplete('tripDestInput',  'tripDestList');
  setupAutocomplete('originInput',    'originList');
  setupAutocomplete('destInput',      'destList');
  setupAutocomplete('stayAddrInput',  'stayAddrList');
  setupAutocomplete('itinPlace',      'itinPlaceList');
  setupAutocomplete('actPlace',       'actPlaceList');
}

// ============================================================
// RANKING DE VIAJEROS
// ============================================================

// Haversine: distancia en km entre dos puntos lat/lng
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Cache de coordenadas para no repetir llamadas
const coordCache = {};

async function getCoords(place) {
  if (!place) return null;
  const key = place.trim().toLowerCase();
  if (coordCache[key]) return coordCache[key];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    coordCache[key] = coords;
    return coords;
  } catch(e) { return null; }
}

function switchRankingTab(btn) {
  document.querySelectorAll('.ranking-period-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

async function loadRanking(period) {
  const flightsEl = document.querySelector('#rankingFlights');
  const kmEl = document.querySelector('#rankingKm');
  const myEl = document.querySelector('#myRankingStats');

  flightsEl.innerHTML = '<p class="muted">Calculando...</p>';
  kmEl.innerHTML = '<p class="muted">Calculando km (puede tardar unos segundos)...</p>';

  try {
  // Traer trips (lectura pública)
  const { data: trips, error: tripsErr } = await supabase.from('trips').select('id, user_id');
  if (tripsErr) throw tripsErr;
  const tripUserMap = {};
  (trips || []).forEach(t => { tripUserMap[t.id] = t.user_id; });

  // Traer vuelos
  let flightsQuery = supabase.from('trip_transports')
    .select('trip_id, origin, destination, round_trip').eq('type', 'vuelo');
  if (period === 'year') {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    flightsQuery = flightsQuery.gte('created_at', yearStart);
  }
  const { data: flights, error: flErr } = await flightsQuery;
  if (flErr) throw flErr;

  // Traer perfiles
  const { data: profiles } = await supabase.from('profiles').select('id, username');
  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p.username || 'Viajero'; });

  // Agrupar vuelos por usuario
  const byUser = {};
  (flights || []).forEach(f => {
    const userId = tripUserMap[f.trip_id];
    if (!userId) return;
    if (!byUser[userId]) byUser[userId] = { flights: [], username: profileMap[userId] || 'Viajero' };
    // Si es ida y vuelta, agregar dos veces
    byUser[userId].flights.push(f);
    if (parseInt(f.round_trip) === 1) byUser[userId].flights.push({...f, _isReturn: true});
  });

  // ---- RANKING POR VUELOS ----
  const flightRanking = Object.entries(byUser)
    .map(([uid, d]) => ({ uid, username: d.username, count: d.flights.length }))
    .sort((a, b) => b.count - a.count);

  flightsEl.innerHTML = flightRanking.length
    ? flightRanking.map((u, i) => rankingRow(i, u.username, u.count + ' vuelo' + (u.count !== 1 ? 's' : ''), u.uid === state.currentUser?.id)).join('')
    : '<p class="muted">Sin datos de vuelos aún.</p>';

  // ---- RANKING POR KM (con geocoding) ----
  // Calcular km para cada usuario
  const kmByUser = {};
  for (const [uid, d] of Object.entries(byUser)) {
    kmByUser[uid] = { username: d.username, km: 0, uid };
    for (const f of d.flights) {
      if (!f.origin || !f.destination) continue;
      const [c1, c2] = await Promise.all([getCoords(f.origin), getCoords(f.destination)]);
      if (c1 && c2) {
        kmByUser[uid].km += haversineKm(c1.lat, c1.lon, c2.lat, c2.lon);
      }
      // Pequeña pausa para no saturar Nominatim
      await new Promise(r => setTimeout(r, 150));
    }
  }

  const kmRanking = Object.values(kmByUser).sort((a, b) => b.km - a.km);

  kmEl.innerHTML = kmRanking.length
    ? kmRanking.map((u, i) => rankingRow(i, u.username, Math.round(u.km).toLocaleString('es-AR') + ' km', u.uid === state.currentUser?.id)).join('')
    : '<p class="muted">Sin datos suficientes para calcular km.</p>';

  // ---- TU POSICIÓN ----
  const myId = state.currentUser?.id;
  if (myId) {
    const myFlightPos = flightRanking.findIndex(u => u.uid === myId);
    const myKmPos = kmRanking.findIndex(u => u.uid === myId);
    const myFlights = byUser[myId]?.flights.length || 0;
    const myKm = kmByUser[myId]?.km || 0;

    myEl.innerHTML = `
      <div class="ranking-my-grid">
        <div class="stat-card">
          <span>Tu puesto (vuelos)</span>
          <strong>${myFlightPos >= 0 ? '#' + (myFlightPos + 1) : 'Sin datos'}</strong>
        </div>
        <div class="stat-card">
          <span>Tus vuelos</span>
          <strong>${myFlights}</strong>
        </div>
        <div class="stat-card">
          <span>Tu puesto (km)</span>
          <strong>${myKmPos >= 0 ? '#' + (myKmPos + 1) : 'Sin datos'}</strong>
        </div>
        <div class="stat-card">
          <span>Tus km volados</span>
          <strong>${Math.round(myKm).toLocaleString('es-AR')}</strong>
        </div>
      </div>`;
  }

  } catch(err) {
    console.error('Ranking error:', err);
    flightsEl.innerHTML = '<p style="color:var(--danger);">Error: ' + (err.message || JSON.stringify(err)) + '</p>';
    kmEl.innerHTML = '';
  }
}

function rankingRow(index, username, value, isMe) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = index < 3 ? medals[index] : `#${index + 1}`;
  return `
    <div class="ranking-row ${isMe ? 'ranking-row-me' : ''}">
      <span class="ranking-pos">${medal}</span>
      <span class="ranking-name">${username}${isMe ? ' <span class="ranking-you">(vos)</span>' : ''}</span>
      <span class="ranking-value">${value}</span>
    </div>`;
}

// Cargar ranking cuando se navega a esa sección
const _origShowSection = showSection;
showSection = function(sectionId) {
  _origShowSection(sectionId);
  if (sectionId === 'rankingSection') loadRanking('all');
};
