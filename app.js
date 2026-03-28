const SUPABASE_URL = "https://katapwuimxbknrjzormr.supabase.co";
const SUPABASE_KEY = "sb_publishable_jnCfCZWv4hTuy6SpllJ8hg_UiC9K8AR";

if (!window.supabase) {
  throw new Error("Supabase no cargó. Revisá el script CDN en index.html");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


const STORAGE_KEYS = {
  db: 'voyanta_db',
  currentUserId: 'voyanta_current_user_id'
};

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80';

const state = {
  db: null,
  currentUser: null,
  selectedTripId: null,
  categoryChart: null,
  timelineChart: null,
  miniMap: null,
  fullMap: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

window.switchAuthTab = function (target, clickedButton) {
  console.log("switchAuthTab ejecutó:", target);

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const tabs = document.querySelectorAll("[data-auth-switch] .tab");

  tabs.forEach((tab) => tab.classList.remove("active"));
  if (clickedButton) clickedButton.classList.add("active");

  loginForm.classList.toggle("hidden", target !== "loginForm");
  signupForm.classList.toggle("hidden", target !== "signupForm");
};

function switchAuthTab(target, clickedButton) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const tabs = document.querySelectorAll("[data-auth-switch] .tab");

  tabs.forEach((tab) => tab.classList.remove("active"));
  clickedButton.classList.add("active");

  loginForm.classList.toggle("hidden", target !== "loginForm");
  signupForm.classList.toggle("hidden", target !== "signupForm");
}


function seedDatabase() {
  const demoUserId = uid();
  const demoTripId = uid();
  const secondTripId = uid();
  return {
    users: [
      {
        id: demoUserId,
        username: 'Felipe Demo',
        email: 'demo@voyanta.app',
        password: 'demo1234',
        createdAt: new Date().toISOString()
      }
    ],
    trips: [
      {
        id: demoTripId,
        userId: demoUserId,
        name: 'Luna de miel por Italia',
        destination: 'Roma · Florencia · Amalfi',
        startDate: '2026-04-10',
        endDate: '2026-04-21',
        status: 'planeado',
        description: 'Viaje romántico con historia, comida y costa. Base ideal para probar toda la app.',
        coverImage: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1400&q=80',
        baseCurrency: 'EUR',
        budget: 4200,
        collaborators: [],
        transport: [
          { id: uid(), type: 'vuelo', origin: 'Buenos Aires', destination: 'Roma', departure: '2026-04-10T18:30', arrival: '2026-04-11T11:20', company: 'ITA Airways', reference: 'AZ8892', cost: 1450, currency: 'USD', notes: 'Asientos 15A y 15B.' },
          { id: uid(), type: 'tren', origin: 'Roma', destination: 'Florencia', departure: '2026-04-14T09:15', arrival: '2026-04-14T10:47', company: 'Trenitalia', reference: 'FR9921', cost: 78, currency: 'EUR', notes: 'Reservar equipaje grande.' }
        ],
        stays: [
          { id: uid(), type: 'hotel', name: 'Hotel Artemide', address: 'Via Nazionale 22, Roma', checkIn: '2026-04-11', checkOut: '2026-04-14', nights: 3, cost: 960, currency: 'EUR', notes: 'Incluye desayuno.', bookingLink: 'https://example.com/hotel' },
          { id: uid(), type: 'Airbnb', name: 'Casa con vista al Duomo', address: 'Florencia, Italia', checkIn: '2026-04-14', checkOut: '2026-04-17', nights: 3, cost: 740, currency: 'EUR', notes: 'Auto check-in.', bookingLink: 'https://example.com/airbnb' }
        ],
        itinerary: [
          { id: uid(), date: '2026-04-11', time: '15:00', place: 'Centro histórico', title: 'Paseo inicial y gelato', priority: 'media', status: 'pendiente', description: 'Caminar sin apuro, Fontana di Trevi y Piazza Navona.' },
          { id: uid(), date: '2026-04-12', time: '09:00', place: 'Coliseo', title: 'Tour Coliseo y Foro', priority: 'alta', status: 'reservado', description: 'Llegar 20 minutos antes.' },
          { id: uid(), date: '2026-04-12', time: '20:30', place: 'Trastevere', title: 'Cena romántica', priority: 'alta', status: 'pendiente', description: 'Reservar terraza.' }
        ],
        activities: [
          { id: uid(), name: 'Excursión Costa Amalfitana', date: '2026-04-18', time: '08:00', place: 'Amalfi', provider: 'Bluetour', cost: 210, currency: 'EUR', people: 2, notes: 'Incluye traslado desde Nápoles.', bookingStatus: 'confirmado' }
        ],
        expenses: [
          { id: uid(), concept: 'Seña vuelos', category: 'transporte', amount: 600, currency: 'USD', date: '2026-01-20', paymentMethod: 'Visa', notes: 'Primera cuota del aéreo.' },
          { id: uid(), concept: 'Reserva hotel Roma', category: 'alojamiento', amount: 960, currency: 'EUR', date: '2026-02-14', paymentMethod: 'Mastercard', notes: 'Cancelable.' },
          { id: uid(), concept: 'Cena de prueba', category: 'comida', amount: 85, currency: 'EUR', date: '2026-04-12', paymentMethod: 'Amex', notes: 'Trastevere.' },
          { id: uid(), concept: 'Tour Coliseo', category: 'excursiones', amount: 98, currency: 'EUR', date: '2026-03-01', paymentMethod: 'Mastercard', notes: '2 personas.' }
        ],
        notes: [
          { id: uid(), title: 'Checklist equipaje', type: 'equipaje', content: 'Pasaportes, adaptadores, seguro, reserva impresa, cargadores, perfume.', createdAt: new Date().toISOString() },
          { id: uid(), title: 'Ideas', type: 'idea', content: 'Ver si conviene agregar Venecia dos noches más adelante.', createdAt: new Date().toISOString() }
        ],
        mapPoints: [
          { id: uid(), label: 'Roma', lat: 41.9028, lng: 12.4964, type: 'destino' },
          { id: uid(), label: 'Florencia', lat: 43.7696, lng: 11.2558, type: 'destino' },
          { id: uid(), label: 'Amalfi', lat: 40.634, lng: 14.6027, type: 'actividad' }
        ]
      },
      {
        id: secondTripId,
        userId: demoUserId,
        name: 'Escapada a Nueva York',
        destination: 'Nueva York',
        startDate: '2026-05-04',
        endDate: '2026-05-09',
        status: 'planeado',
        description: 'Broadway, rooftops, museums y compras.',
        coverImage: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1400&q=80',
        baseCurrency: 'USD',
        budget: 2800,
        collaborators: [],
        transport: [],
        stays: [],
        itinerary: [],
        activities: [],
        expenses: [],
        notes: [],
        mapPoints: [{ id: uid(), label: 'New York', lat: 40.7128, lng: -74.0060, type: 'destino' }]
      }
    ],
    forumPosts: [
      {
        id: uid(),
        userId: demoUserId,
        author: 'Felipe Demo',
        title: '¿Mejores barrios para alojarse en Roma sin pagar una fortuna?',
        category: 'Preguntas',
        content: 'Busco algo lindo, caminable y con buena conexión. ¿Monti, Trastevere o Prati?',
        createdAt: new Date().toISOString(),
        comments: [
          { id: uid(), author: 'Mica', content: 'Monti me resultó ideal: lindo, con onda y cerca de todo.', createdAt: new Date().toISOString() }
        ]
      }
    ]
  };
}

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEYS.db);
  if (!raw) {
    const seeded = seedDatabase();
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}

function saveDB() {
  localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(state.db));
}

function setCurrentUser(userId) {
  if (userId) localStorage.setItem(STORAGE_KEYS.currentUserId, userId);
  else localStorage.removeItem(STORAGE_KEYS.currentUserId);
  state.currentUser = state.db.users.find(u => u.id === userId) || null;
}

function getCurrentUserTrips() {
  return state.db.trips.filter(trip => trip.userId === state.currentUser?.id);
}

function getSelectedTrip() {
  return state.db.trips.find(t => t.id === state.selectedTripId) || null;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function diffDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end - start;
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function money(value, currency = 'USD') {
  const numeric = Number(value || 0);
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(0)}`;
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openModal(id) {
  $('#modalBackdrop').classList.remove('hidden');
  $(`#${id}`).classList.remove('hidden');
}

function closeAllModals() {
  $('#modalBackdrop').classList.add('hidden');
  $$('.modal').forEach(modal => modal.classList.add('hidden'));
}

function showAuth(show = true) {
  $('#authView').classList.toggle('hidden', !show);
  $('#mainView').classList.toggle('hidden', show);
}

function renderAuthTabs() {
  
}

function renderUserProfile() {
  const user = state.currentUser;
  if (!user) return;
  const initial = user.username?.[0]?.toUpperCase() || 'V';
  $('#avatarLetter').textContent = initial;
  $('#profileAvatar').textContent = initial;
  $('#userNameDisplay').textContent = user.username;
  $('#userEmailDisplay').textContent = user.email;
  $('#profileName').textContent = user.username;
  $('#profileEmail').textContent = user.email;
}

function renderTripStats(trips) {
  const inProgress = trips.filter(t => t.status === 'en curso').length;
  const totalSpent = trips.reduce((acc, trip) => acc + trip.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), 0);
  const sampleCurrency = trips[0]?.baseCurrency || 'USD';
  $('#statTrips').textContent = trips.length;
  $('#statInProgress').textContent = inProgress;
  $('#statTotalSpent').textContent = money(totalSpent, sampleCurrency);
}

function getTripCardBackground(trip) {
  return trip.coverImage || DEFAULT_COVER;
}

function renderTripGrid(filter = '') {
  const trips = getCurrentUserTrips();
  renderTripStats(trips);
  const normalized = filter.trim().toLowerCase();
  const filtered = trips.filter(trip =>
    [trip.name, trip.destination, trip.status].join(' ').toLowerCase().includes(normalized)
  );

  $('#emptyTrips').classList.toggle('hidden', filtered.length > 0);
  $('#tripGrid').innerHTML = filtered.map(trip => `
    <article class="trip-card" data-trip-id="${trip.id}" style="background-image:url('${getTripCardBackground(trip)}')">
      <div class="trip-card-content">
        <div class="card-top">
          <span class="pill">${escapeHtml(trip.status)}</span>
          <span class="badge"><i class="fa-solid fa-coins"></i> ${escapeHtml(trip.baseCurrency || 'USD')}</span>
        </div>
        <div>
          <h4>${escapeHtml(trip.name)}</h4>
          <p>${escapeHtml(trip.description || 'Sin descripción')}</p>
        </div>
        <div class="trip-card-meta">
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(trip.destination)}</span>
          <span><i class="fa-solid fa-calendar"></i> ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</span>
          <span><i class="fa-solid fa-hourglass-half"></i> ${diffDays(trip.startDate, trip.endDate)} días</span>
        </div>
      </div>
    </article>
  `).join('');
}

function nextTransport(trip) {
  const now = new Date();
  return [...trip.transport]
    .filter(t => new Date(t.departure) >= now)
    .sort((a,b) => new Date(a.departure) - new Date(b.departure))[0];
}

function nextActivity(trip) {
  const now = new Date();
  return [...trip.itinerary]
    .filter(item => new Date(`${item.date}T${item.time || '00:00'}`) >= now)
    .sort((a,b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))[0];
}

function renderTripDetail() {
  const trip = getSelectedTrip();
  const detail = $('#tripDetailSection');
  if (!trip) {
    detail.classList.add('hidden');
    return;
  }
  detail.classList.remove('hidden');

  $('#tripCoverImage').style.backgroundImage = `url('${getTripCardBackground(trip)}')`;
  $('#tripStatusBadge').textContent = trip.status;
  $('#tripTitle').textContent = trip.name;
  $('#tripDescription').textContent = trip.description || 'Sin descripción';
  $('#tripDestination').textContent = trip.destination;
  $('#tripDates').textContent = `${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}`;
  $('#tripDays').textContent = `${diffDays(trip.startDate, trip.endDate)} días`;

  const nextT = nextTransport(trip);
  const nextA = nextActivity(trip);
  const totalSpent = trip.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  $('#overviewTransport').textContent = nextT ? `${nextT.origin} → ${nextT.destination}` : 'Nada próximo';
  $('#overviewActivity').textContent = nextA ? `${nextA.title} · ${formatDate(nextA.date)}` : 'Nada próximo';
  $('#overviewSpent').textContent = money(totalSpent, trip.baseCurrency || 'USD');
  $('#overviewBudget').textContent = trip.budget ? `${money(trip.budget, trip.baseCurrency || 'USD')}` : 'Sin presupuesto';

  renderSummary(trip);
  renderTransport(trip);
  renderStays(trip);
  renderItinerary(trip);
  renderActivities(trip);
  renderExpenses(trip);
  renderNotes(trip);
  renderMaps(trip);
}

function renderSummary(trip) {
  const totalSpent = trip.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const highlightData = [
    ['Tramos cargados', trip.transport.length],
    ['Alojamientos', trip.stays.length],
    ['Actividades diarias', trip.itinerary.length],
    ['Excursiones', trip.activities.length],
    ['Notas', trip.notes.length],
    ['Presupuesto restante', trip.budget ? money(trip.budget - totalSpent, trip.baseCurrency) : 'No definido']
  ];
  $('#summaryHighlights').innerHTML = highlightData
    .map(([k, v]) => `<div class="summary-item"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');
  renderExpenseCharts(trip);
}

function renderTransport(trip) {
  $('#transportList').innerHTML = trip.transport.length ? trip.transport
    .sort((a,b) => new Date(a.departure) - new Date(b.departure))
    .map(item => `
      <article class="item-card">
        <div class="item-card-top">
          <div>
            <h4><i class="fa-solid fa-plane-departure"></i> ${escapeHtml(item.type.toUpperCase())} · ${escapeHtml(item.origin)} → ${escapeHtml(item.destination)}</h4>
            <div class="item-meta">
              <span>${formatDateTime(item.departure)}</span>
              <span>${formatDateTime(item.arrival)}</span>
              <span>${escapeHtml(item.company || 'Sin empresa')}</span>
              <span>${escapeHtml(item.reference || 'Sin referencia')}</span>
            </div>
          </div>
          <span class="badge">${money(item.cost, item.currency || trip.baseCurrency)}</span>
        </div>
        <div class="item-notes">${escapeHtml(item.notes || 'Sin observaciones')}</div>
      </article>
    `).join('') : `<div class="empty-state"><p>No hay tramos cargados todavía.</p></div>`;
}

function renderStays(trip) {
  $('#stayList').innerHTML = trip.stays.length ? trip.stays.map(item => `
    <article class="item-card">
      <div class="item-card-top">
        <div>
          <h4>${escapeHtml(item.name)} <span class="badge">${escapeHtml(item.type)}</span></h4>
          <div class="item-meta">
            <span>${formatDate(item.checkIn)} → ${formatDate(item.checkOut)}</span>
            <span>${item.nights || 0} noches</span>
            <span>${escapeHtml(item.address || 'Sin dirección')}</span>
          </div>
        </div>
        <span class="badge">${money(item.cost, item.currency || trip.baseCurrency)}</span>
      </div>
      <div class="item-notes">${escapeHtml(item.notes || 'Sin observaciones')}</div>
      ${item.bookingLink ? `<a href="${escapeHtml(item.bookingLink)}" target="_blank" rel="noopener" class="muted">Abrir reserva</a>` : ''}
    </article>
  `).join('') : `<div class="empty-state"><p>No hay alojamientos cargados.</p></div>`;
}

function groupItineraryByDay(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    acc[item.date].sort((a,b) => (a.time || '').localeCompare(b.time || ''));
    return acc;
  }, {});
}

function renderItinerary(trip) {
  const grouped = groupItineraryByDay(trip.itinerary);
  const days = Object.keys(grouped).sort();
  $('#itineraryDays').innerHTML = days.length ? days.map(day => `
    <section class="day-block">
      <div class="day-header">
        <div>
          <h4>${formatDate(day)}</h4>
          <p class="muted">${grouped[day].length} actividades</p>
        </div>
        <span class="badge"><i class="fa-solid fa-list-check"></i> Agenda del día</span>
      </div>
      <div class="day-timeline" data-day="${day}">
        ${grouped[day].map(item => `
          <article class="timeline-item" data-item-id="${item.id}">
            <div class="timeline-time">${escapeHtml(item.time || '--:--')}</div>
            <div class="timeline-content">
              <div class="item-card-top">
                <h4>${escapeHtml(item.title)}</h4>
                <div class="item-meta">
                  <span class="badge">${escapeHtml(item.priority)}</span>
                  <span class="badge">${escapeHtml(item.status)}</span>
                </div>
              </div>
              <p>${escapeHtml(item.place || 'Sin lugar')} · ${escapeHtml(item.description || 'Sin descripción')}</p>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `).join('') : `<div class="empty-state"><p>No hay actividades diarias todavía.</p></div>`;

  $$('.day-timeline').forEach(container => {
    new Sortable(container, {
      animation: 180,
      onEnd: () => {
        const ids = Array.from(container.querySelectorAll('.timeline-item')).map(el => el.dataset.itemId);
        const currentTrip = getSelectedTrip();
        const day = container.dataset.day;
        const dayItems = currentTrip.itinerary.filter(x => x.date === day);
        const reordered = ids.map(id => dayItems.find(x => x.id === id)).filter(Boolean);
        currentTrip.itinerary = currentTrip.itinerary.filter(x => x.date !== day).concat(reordered);
        saveDB();
        renderItinerary(currentTrip);
      }
    });
  });
}

function renderActivities(trip) {
  $('#activityList').innerHTML = trip.activities.length ? trip.activities.map(item => `
    <article class="item-card">
      <div class="item-card-top">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <div class="item-meta">
            <span>${formatDate(item.date)} ${escapeHtml(item.time || '')}</span>
            <span>${escapeHtml(item.place || 'Sin lugar')}</span>
            <span>${escapeHtml(item.provider || 'Sin proveedor')}</span>
            <span>${item.people || 1} personas</span>
          </div>
        </div>
        <span class="badge">${money(item.cost, item.currency || trip.baseCurrency)}</span>
      </div>
      <div class="item-meta"><span class="badge">Reserva: ${escapeHtml(item.bookingStatus)}</span></div>
      <div class="item-notes">${escapeHtml(item.notes || 'Sin observaciones')}</div>
    </article>
  `).join('') : `<div class="empty-state"><p>No hay excursiones cargadas.</p></div>`;
}

function renderExpenses(trip) {
  const total = trip.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  $('#expenseList').innerHTML = trip.expenses.length ? [...trip.expenses]
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .map(item => `
      <article class="item-card">
        <div class="item-card-top">
          <div>
            <h4>${escapeHtml(item.concept)}</h4>
            <div class="item-meta">
              <span>${formatDate(item.date)}</span>
              <span>${escapeHtml(item.category)}</span>
              <span>${escapeHtml(item.paymentMethod || 'Sin método')}</span>
            </div>
          </div>
          <span class="badge">${money(item.amount, item.currency || trip.baseCurrency)}</span>
        </div>
        <div class="item-notes">${escapeHtml(item.notes || 'Sin notas')}</div>
      </article>
  `).join('') : `<div class="empty-state"><p>No hay gastos cargados.</p></div>`;

  const byCategory = trip.expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
    return acc;
  }, {});

  const summary = Object.entries(byCategory)
    .sort((a,b) => b[1] - a[1])
    .map(([category, amount]) => `<div class="summary-item"><span>${category}</span><strong>${money(amount, trip.baseCurrency)}</strong></div>`)
    .join('');

  $('#expenseSummary').innerHTML = `
    <div class="summary-item"><span>Total del viaje</span><strong>${money(total, trip.baseCurrency)}</strong></div>
    <div class="summary-item"><span>Presupuesto</span><strong>${trip.budget ? money(trip.budget, trip.baseCurrency) : 'No definido'}</strong></div>
    <div class="summary-item"><span>Diferencia</span><strong>${trip.budget ? money(trip.budget - total, trip.baseCurrency) : '—'}</strong></div>
    ${summary || `<div class="summary-item"><span>Sin subtotales</span><strong>0</strong></div>`}
  `;
}

function renderNotes(trip) {
  $('#noteList').innerHTML = trip.notes.length ? trip.notes.map(note => `
    <article class="note-card">
      <div class="item-card-top">
        <h4>${escapeHtml(note.title)}</h4>
        <span class="badge">${escapeHtml(note.type)}</span>
      </div>
      <div>${escapeHtml(note.content)}</div>
      <div class="muted small">${new Date(note.createdAt).toLocaleString('es-AR')}</div>
    </article>
  `).join('') : `<div class="empty-state"><p>No hay notas guardadas.</p></div>`;
}

function renderExpenseCharts(trip) {
  const categoryData = trip.expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
  const ctxCategory = $('#expenseCategoryChart');
  const ctxTimeline = $('#expenseTimelineChart');

  if (state.categoryChart) state.categoryChart.destroy();
  if (state.timelineChart) state.timelineChart.destroy();

  state.categoryChart = new Chart(ctxCategory, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData),
      datasets: [{ data: Object.values(categoryData), backgroundColor: ['#60a5fa','#22d3ee','#34d399','#fbbf24','#f472b6','#a78bfa'], borderWidth: 0 }]
    },
    options: {
      plugins: { legend: { labels: { color: '#d7e8fb' } } },
      cutout: '66%'
    }
  });

  const expenseTimeline = [...trip.expenses]
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, item) => {
      acc.labels.push(formatDate(item.date));
      acc.values.push(Number(item.amount || 0));
      return acc;
    }, { labels: [], values: [] });

  state.timelineChart = new Chart(ctxTimeline, {
    type: 'line',
    data: {
      labels: expenseTimeline.labels,
      datasets: [{ label: 'Gastos', data: expenseTimeline.values, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.15)', tension: 0.35, fill: true }]
    },
    options: {
      plugins: { legend: { labels: { color: '#d7e8fb' } } },
      scales: {
        x: { ticks: { color: '#a9bdd6' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#a9bdd6' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function makePopup(point) {
  return `<strong>${escapeHtml(point.label)}</strong><br>${escapeHtml(point.type)}`;
}

function renderMaps(trip) {
  const points = trip.mapPoints?.length ? trip.mapPoints : [{ label: trip.destination, lat: 0, lng: 0, type: 'destino' }];
  const validPoints = points.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
  const first = validPoints[0] || { lat: 41.9, lng: 12.49 };

  if (!state.miniMap) {
    state.miniMap = L.map('miniMap', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(state.miniMap);
  }
  if (!state.fullMap) {
    state.fullMap = L.map('fullMap');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(state.fullMap);
  }

  [state.miniMap, state.fullMap].forEach(map => {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) map.removeLayer(layer);
    });
    const latlngs = validPoints.map(p => [p.lat, p.lng]);
    validPoints.forEach(point => {
      L.marker([point.lat, point.lng]).addTo(map).bindPopup(makePopup(point));
    });
    if (latlngs.length > 1) L.polyline(latlngs, { color: '#60a5fa', weight: 3, opacity: 0.8 }).addTo(map);
    map.setView([first.lat, first.lng], 5);
    if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [30, 30] });
    setTimeout(() => map.invalidateSize(), 160);
  });
}

function renderForum() {
  const posts = [...state.db.forumPosts].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  $('#forumList').innerHTML = posts.map(post => `
    <article class="forum-card">
      <div class="item-card-top">
        <div>
          <span class="badge">${escapeHtml(post.category)}</span>
          <h4>${escapeHtml(post.title)}</h4>
        </div>
        <span class="muted small">${new Date(post.createdAt).toLocaleDateString('es-AR')}</span>
      </div>
      <p>${escapeHtml(post.content)}</p>
      <div class="forum-card-footer">
        <span>Por ${escapeHtml(post.author)}</span>
        <span>${post.comments.length} comentarios</span>
      </div>
      <div class="comment-list">
        ${post.comments.map(comment => `
          <div class="comment-item">
            <strong>${escapeHtml(comment.author)}</strong>
            <p>${escapeHtml(comment.content)}</p>
          </div>
        `).join('')}
      </div>
      <form class="inline-comment" data-post-id="${post.id}">
        <input name="comment" placeholder="Responder a la comunidad" required />
        <button class="btn btn-secondary" type="submit">Comentar</button>
      </form>
    </article>
  `).join('');
}

function activateSection(sectionId) {
  $$('.page-section').forEach(section => section.classList.remove('active'));
  $(`#${sectionId}`).classList.add('active');
  $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));
  $('#pageTitle').textContent = sectionId === 'communitySection' ? 'Comunidad' : sectionId === 'profileSection' ? 'Perfil' : 'Mis viajes';
}

function fillTripForm(trip = null) {
  const form = $('#tripForm');
  form.reset();
  $('#tripModalTitle').textContent = trip ? 'Editar viaje' : 'Nuevo viaje';
  form.tripId.value = trip?.id || '';
  form.name.value = trip?.name || '';
  form.destination.value = trip?.destination || '';
  form.startDate.value = trip?.startDate || '';
  form.endDate.value = trip?.endDate || '';
  form.status.value = trip?.status || 'planeado';
  form.baseCurrency.value = trip?.baseCurrency || 'USD';
  form.description.value = trip?.description || '';
  form.coverImage.value = trip?.coverImage || '';
  form.budget.value = trip?.budget || '';
}

function saveTripFromForm(formData) {
  const payload = Object.fromEntries(formData.entries());
  const tripId = payload.tripId;
  const data = {
    name: payload.name,
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status,
    baseCurrency: payload.baseCurrency,
    description: payload.description,
    coverImage: payload.coverImage,
    budget: Number(payload.budget || 0),
  };

  if (tripId) {
    const trip = state.db.trips.find(t => t.id === tripId);
    Object.assign(trip, data);
    state.selectedTripId = trip.id;
  } else {
    const newTrip = {
      id: uid(),
      userId: state.currentUser.id,
      ...data,
      collaborators: [],
      transport: [],
      stays: [],
      itinerary: [],
      activities: [],
      expenses: [],
      notes: [],
      mapPoints: []
    };
    state.db.trips.unshift(newTrip);
    state.selectedTripId = newTrip.id;
  }
  saveDB();
  renderTripGrid($('#searchTrips').value);
  renderTripDetail();
  closeAllModals();
}

function appendToSelectedTrip(key, item) {
  const trip = getSelectedTrip();
  if (!trip) return;
  trip[key].push({ id: uid(), ...item });
  saveDB();
  renderTripDetail();
  closeAllModals();
}

function bindForms() {
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    const user = state.db.users.find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) return alert('Usuario o contraseña incorrectos. Probá con demo@voyanta.app / demo1234');
    setCurrentUser(user.id);
    showAuth(false);
    initMainApp();
  });

  $('#signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = String(data.get('username')).trim();
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    if (state.db.users.some(u => u.email.toLowerCase() === email)) return alert('Ese email ya está registrado.');
    const user = { id: uid(), username, email, password, createdAt: new Date().toISOString() };
    state.db.users.push(user);
    saveDB();
    setCurrentUser(user.id);
    showAuth(false);
    initMainApp();
  });

  $('#tripForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveTripFromForm(new FormData(e.currentTarget));
  });

  $('#transportForm').addEventListener('submit', (e) => {
    e.preventDefault();
    appendToSelectedTrip('transport', Object.fromEntries(new FormData(e.currentTarget).entries()));
    e.currentTarget.reset();
  });

  $('#stayForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    payload.nights = Number(payload.nights || 0);
    payload.cost = Number(payload.cost || 0);
    appendToSelectedTrip('stays', payload);
    e.currentTarget.reset();
  });

  $('#itineraryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    appendToSelectedTrip('itinerary', Object.fromEntries(new FormData(e.currentTarget).entries()));
    e.currentTarget.reset();
  });

  $('#activityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    payload.cost = Number(payload.cost || 0);
    payload.people = Number(payload.people || 1);
    appendToSelectedTrip('activities', payload);
    e.currentTarget.reset();
  });

  $('#expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    payload.amount = Number(payload.amount || 0);
    appendToSelectedTrip('expenses', payload);
    e.currentTarget.reset();
  });

  $('#noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    payload.createdAt = new Date().toISOString();
    appendToSelectedTrip('notes', payload);
    e.currentTarget.reset();
  });

  $('#postForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    state.db.forumPosts.unshift({
      id: uid(),
      userId: state.currentUser.id,
      author: state.currentUser.username,
      title: payload.title,
      category: payload.category,
      content: payload.content,
      createdAt: new Date().toISOString(),
      comments: []
    });
    saveDB();
    renderForum();
    closeAllModals();
    e.currentTarget.reset();
  });
}

function bindGlobalActions() {
  $('#logoutBtn').addEventListener('click', () => {
    setCurrentUser(null);
    state.selectedTripId = null;
    showAuth(true);
  });

  $('#createTripBtn').addEventListener('click', () => {
    fillTripForm();
    openModal('tripModal');
  });

  $('#editTripBtn').addEventListener('click', () => {
    const trip = getSelectedTrip();
    if (!trip) return;
    fillTripForm(trip);
    openModal('tripModal');
  });

  $('#deleteTripBtn').addEventListener('click', () => {
    const trip = getSelectedTrip();
    if (!trip) return;
    if (!confirm(`¿Eliminar "${trip.name}"?`)) return;
    state.db.trips = state.db.trips.filter(t => t.id !== trip.id);
    state.selectedTripId = getCurrentUserTrips()[0]?.id || null;
    saveDB();
    renderTripGrid($('#searchTrips').value);
    renderTripDetail();
  });

  $('#searchTrips').addEventListener('input', (e) => renderTripGrid(e.target.value));

  document.body.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-item');
    if (navBtn) activateSection(navBtn.dataset.section);

    const tripCard = e.target.closest('.trip-card');
    if (tripCard) {
      state.selectedTripId = tripCard.dataset.tripId;
      renderTripDetail();
      window.scrollTo({ top: $('#tripDetailSection').offsetTop - 10, behavior: 'smooth' });
    }

    const openBtn = e.target.closest('[data-open-modal]');
    if (openBtn) openModal(openBtn.dataset.openModal);

    if (e.target.closest('.close-modal') || e.target.id === 'modalBackdrop') closeAllModals();

    const tripTab = e.target.closest('#tripTabs .tab');
    if (tripTab) {
      $$('#tripTabs .tab').forEach(btn => btn.classList.remove('active'));
      $$('.tab-panel').forEach(panel => panel.classList.remove('active'));
      tripTab.classList.add('active');
      $(`#${tripTab.dataset.tab}`).classList.add('active');
      setTimeout(() => {
        state.miniMap?.invalidateSize();
        state.fullMap?.invalidateSize();
      }, 120);
    }
  });

  document.body.addEventListener('submit', (e) => {
    const commentForm = e.target.closest('.inline-comment');
    if (!commentForm) return;
    e.preventDefault();
    const value = commentForm.comment.value.trim();
    if (!value) return;
    const post = state.db.forumPosts.find(p => p.id === commentForm.dataset.postId);
    if (!post) return;
    post.comments.push({ id: uid(), author: state.currentUser.username, content: value, createdAt: new Date().toISOString() });
    saveDB();
    renderForum();
  });
}

function initMainApp() {
  renderUserProfile();
  const trips = getCurrentUserTrips();
  state.selectedTripId = state.selectedTripId || trips[0]?.id || null;
  renderTripGrid();
  renderTripDetail();
  renderForum();
  activateSection('dashboardSection');
}

function init() {
  state.db = loadDB();
  const currentUserId = localStorage.getItem(STORAGE_KEYS.currentUserId);
  setCurrentUser(currentUserId);
  renderAuthTabs();
  bindForms();
  bindGlobalActions();

  if (state.currentUser) {
    showAuth(false);
    initMainApp();
  } else {
    showAuth(true);
  }
}

document.addEventListener('DOMContentLoaded', init);

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        username: email
      }
    }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Revisá tu email para confirmar la cuenta");
  }
}
