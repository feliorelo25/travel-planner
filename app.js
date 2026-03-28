const SUPABASE_URL = "https://katapwuimxbknrjzormr.supabase.co";
const SUPABASE_KEY = "sb_publishable_jnCfCZWv4hTuy6SpllJ8hg_UiC9K8AR";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// STATE REAL
const state = {
  currentUser: null,
  trips: [],
  selectedTripId: null
};

const $ = (s) => document.querySelector(s);

// ---------------- AUTH ----------------

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return alert(error.message);

  state.currentUser = data.user;
  showApp();
}

async function signup(email, password, username) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) return alert(error.message);

  alert("Cuenta creada. Revisá tu email.");
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// ---------------- TRIPS ----------------

async function loadTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);

  state.trips = data;
  renderTrips();
}

async function createTrip(form) {
  const data = Object.fromEntries(new FormData(form).entries());

  const { error } = await supabase.from("trips").insert({
    user_id: state.currentUser.id,
    name: data.name,
    destination: data.destination,
    start_date: data.startDate,
    end_date: data.endDate,
    description: data.description
  });

  if (error) return alert(error.message);

  closeModal();
  await loadTrips();
}

async function deleteTrip(id) {
  await supabase.from("trips").delete().eq("id", id);
  await loadTrips();
}

// ---------------- UI ----------------

function renderTrips() {
  const container = $("#tripGrid");

  if (!state.trips.length) {
    $("#emptyTrips").classList.remove("hidden");
    container.innerHTML = "";
    return;
  }

  $("#emptyTrips").classList.add("hidden");

  container.innerHTML = state.trips.map(trip => `
    <div class="trip-card" data-id="${trip.id}">
      <div class="trip-card-content">
        <h4>${trip.name}</h4>
        <p>${trip.destination}</p>
        <button onclick="deleteTrip('${trip.id}')">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");
  loadTrips();
}

function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
  $("#modalBackdrop").classList.add("hidden");
}

// ---------------- EVENTS ----------------

document.addEventListener("DOMContentLoaded", async () => {

  // check sesión
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    state.currentUser = data.user;
    showApp();
  }

  // LOGIN
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    login(f.get("email"), f.get("password"));
  });

  // SIGNUP
  $("#signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    signup(f.get("email"), f.get("password"), f.get("username"));
  });

  // CREATE TRIP
  $("#tripForm").addEventListener("submit", (e) => {
    e.preventDefault();
    createTrip(e.target);
  });

  // LOGOUT
  $("#logoutBtn").addEventListener("click", logout);

});
