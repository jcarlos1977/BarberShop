document.addEventListener("DOMContentLoaded", () => {

  // ============================
  // LOGIN / LOGOUT + AUTH STATE
  // ============================

  auth.onAuthStateChanged(async user => {

    // ============================
    // USUARIO NO LOGUEADO
    // ============================
    if (!user) {
      document.getElementById("auth-screen").style.display = "block";
      document.getElementById("app-screen").style.display = "none";
      return;
    }

    // ============================
    // USUARIO LOGUEADO
    // ============================
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "block";

    // ⭐ Mostrar nombre del usuario
    const name = user.email.split("@")[0];
    document.getElementById("logged-user-name").textContent = name;

    // ============================
    // ⭐ Cargar configuración del usuario
    // ============================
    try {
      const settingsDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("settings")
        .doc("workHours")
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        document.getElementById("settings-start-time").value = settings.startTime || "";
        document.getElementById("settings-end-time").value = settings.endTime || "";
      }
    } catch (err) {
      console.error("Error cargando configuración:", err);
    }

    // ============================
    // 🔥 ORDEN CORRECTO DE CARGA
    // ============================

    // 1️⃣ Clientes
    clients = await getClientsFromFirestore();
    renderClientsTable();
    renderClientsSelect();

    // 2️⃣ Servicios (primero cargar defaults si no existen)
    await loadDefaultServicesIntoFirestore();
    services = await getServicesFromFirestore();
    renderServicesTable();
    renderServicesSelect();

    // 3️⃣ Citas
    appointments = await getAppointmentsFromFirestore();
    renderAppointmentsTable();

    // 4️⃣ Inventario
    inventory = await getInventoryFromFirestore();
    renderInventoryTable();

    // 5️⃣ Walk-in Cuts
    walkinCuts = await getWalkinCutsFromFirestore();

    // ============================
    // 🔥 Renderizar todo
    // ============================
    renderCutsToday();
    renderCutsHistory();

    renderDashboard();
    renderReports();
    refreshAll();

    // ============================
    // SELECTS DEL MODAL WALK-IN
    // ============================
    fillWalkinSelects();

    // ============================
    // REFRESCOS AUTOMÁTICOS
    // ============================
    setInterval(() => refreshQuickAlerts(), 1000);
    setInterval(() => refreshNewClientsToday(), 1000);
    setInterval(() => checkUpcomingAppointments(), 60000); // cada minuto

  });


  document.getElementById("auth-login-btn").addEventListener("click", async () => {
    const loginInput = document.getElementById("auth-email").value.trim().toLowerCase();
    const password = document.getElementById("auth-password").value;

    const errorDiv = document.getElementById("auth-error");
    errorDiv.textContent = "";

    try {
      let emailToUse = loginInput;

      // Buscar si lo que escribió es username
      const usersRef = db.collection("users");
      const query = await usersRef.where("username", "==", loginInput).get();

      if (!query.empty) {
        emailToUse = query.docs[0].data().email;
      }

      // Login
      await auth.signInWithEmailAndPassword(emailToUse, password);

      // Obtener username real
      const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
      const userData = userDoc.data();
      const username = userData.username;

      document.getElementById("logged-user-name").textContent = username;

    } catch (err) {
      errorDiv.textContent = "Usuario o contraseña incorrectos.";
      console.error("Login error:", err);
    }
  });



  




  document.getElementById("logout-btn").addEventListener("click", async () => {
    await auth.signOut();
  });

  // ============================
  // NAVEGACIÓN ENTRE TABS
  // ============================

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
      refreshAll();

      if (btn.dataset.tab === "service-photos") {
        renderServicePhotos();
      }
    });
  });

  // ============================
  // FORMULARIO CLIENTES
  // ============================

  const clientForm = document.getElementById("client-form");

  clientForm.addEventListener("submit", e => {
    e.preventDefault();

    const id = document.getElementById("client-id").value || null;
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const notes = document.getElementById("client-notes").value.trim();
    const vip = document.getElementById("client-vip").checked;

    if (!name || !phone) return;

    addOrUpdateClient({
      id,
      name,
      phone,
      notes,
      vip,
      createdDate: new Date().toLocaleDateString("en-CA")
    });

    clientForm.reset();
    document.getElementById("client-id").value = "";

    renderClientsTable();
    renderClientsSelect();
    refreshAll();
  });

  document.getElementById("client-form-reset").addEventListener("click", () => {
    clientForm.reset();
    document.getElementById("client-id").value = "";
  });

  document.addEventListener("click", function(e) {
    if (e.target.classList.contains("edit-client-btn")) {
      const id = e.target.dataset.id;
      const client = clients.find(c => c.id === id);

      document.getElementById("client-id").value = client.id;
      document.getElementById("client-name").value = client.name;
      document.getElementById("client-phone").value = client.phone;
      document.getElementById("client-notes").value = client.notes || "";
      document.getElementById("client-vip").checked = client.vip || false;
    }
  });

  document.addEventListener("click", async function(e) {
    if (e.target.classList.contains("delete-client-btn")) {
      const id = e.target.dataset.id;

      // 🔥 Eliminar en Firestore
      await deleteClientFromFirestore(id);

      // 🔥 Recargar lista desde Firestore
      clients = await getClientsFromFirestore();

      // 🔥 Volver a dibujar todo
      renderClientsTable();
      renderDashboard();
    }
  });

  // ============================
  // FORMULARIO SERVICIOS
  // ============================

  const serviceForm = document.getElementById("service-form");

  serviceForm.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("service-id").value || null;
    const name = document.getElementById("service-name").value.trim();
    const duration = parseInt(document.getElementById("service-duration").value, 10);
    const price = parseFloat(document.getElementById("service-price").value);
    const active = document.getElementById("service-active").checked;

    if (!name || isNaN(duration) || isNaN(price)) return;

    await addOrUpdateService({ id, name, duration, price, active });

    serviceForm.reset();
    document.getElementById("service-id").value = "";

    services = await getServicesFromFirestore();
    renderServicesTable();
    renderServicesSelect();
    refreshAll();
  });

  document.getElementById("service-form-reset").addEventListener("click", () => {
    serviceForm.reset();
    document.getElementById("service-id").value = "";
  });

  document.getElementById("services-table-body").addEventListener("click", async e => {
    const btn = e.target;
    if (btn.tagName !== "BUTTON") return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      const service = services.find(s => s.id === id);
      if (!service) return;

      document.getElementById("service-id").value = service.id;
      document.getElementById("service-name").value = service.name;
      document.getElementById("service-duration").value = service.duration;
      document.getElementById("service-price").value = service.price;
      document.getElementById("service-active").checked = !!service.active;
    }

    else if (action === "delete") {
      await deleteServiceFromFirestore(id);
      services = await getServicesFromFirestore();
      renderServicesTable();
      renderServicesSelect();
      refreshAll();
    }
  });

  // ============================
  // FORMULARIO INVENTARIO
  // ============================

  const inventoryForm = document.getElementById("inventory-form");

  inventoryForm.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("inventory-id").value || null;
    const name = document.getElementById("inventory-name").value.trim();
    const qty = parseInt(document.getElementById("inventory-qty").value, 10);
    const min = parseInt(document.getElementById("inventory-min").value, 10);
    const cost = parseFloat(document.getElementById("inventory-cost").value);

    if (!name || isNaN(qty) || isNaN(min) || isNaN(cost)) return;

    await addOrUpdateInventoryItem({ id, name, qty, min, cost });

    inventory = await getInventoryFromFirestore();

    renderInventoryTable();
    refreshAll();

    inventoryForm.reset();
    document.getElementById("inventory-id").value = "";
  });

  document.getElementById("inventory-form-reset").addEventListener("click", () => {
    inventoryForm.reset();
    document.getElementById("inventory-id").value = "";
  });

  document.getElementById("inventory-table-body").addEventListener("click", async e => {
    const btn = e.target;
    if (btn.tagName !== "BUTTON") return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      const item = inventory.find(i => i.id === id);
      if (!item) return;

      document.getElementById("inventory-id").value = item.id;
      document.getElementById("inventory-name").value = item.name;
      document.getElementById("inventory-qty").value = item.qty;
      document.getElementById("inventory-min").value = item.min;
      document.getElementById("inventory-cost").value = item.cost;
    }

    else if (action === "delete") {
      await deleteInventoryItemFromFirestore(id);
      inventory = await getInventoryFromFirestore();
      renderInventoryTable();
      refreshAll();
    }
  });

  // ============================
  // FORMULARIO CITAS
  // ============================

  const appointmentForm = document.getElementById("appointment-form");

  appointmentForm.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("appointment-id").value || null;
    const date = document.getElementById("appointment-date").value;
    const time = document.getElementById("appointment-time").value;
    const clientId = document.getElementById("appointment-client").value;
    const serviceId = document.getElementById("appointment-service").value;
    const barber = document.getElementById("appointment-barber").value.trim();
    const status = document.getElementById("appointment-status").value;

    if (!date || !time || !clientId || !serviceId || !barber) return;

    await addOrUpdateAppointment({ id, date, time, clientId, serviceId, barber, status });

    appointments = await getAppointmentsFromFirestore();
    showAvailableSlots(date);


    renderAppointmentsTable();
    refreshAll();

    appointmentForm.reset();
    document.getElementById("appointment-id").value = "";
  });

  document.getElementById("appointment-form-reset").addEventListener("click", () => {
    appointmentForm.reset();
    document.getElementById("appointment-id").value = "";
  });

  document.getElementById("appointments-table-body").addEventListener("click", async e => {
    const btn = e.target;
    if (btn.tagName !== "BUTTON") return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      const app = appointments.find(a => a.id === id);
      if (!app) return;

      document.getElementById("appointment-id").value = app.id;
      document.getElementById("appointment-date").value = app.date;
      document.getElementById("appointment-time").value = app.time;
      document.getElementById("appointment-client").value = app.clientId;
      document.getElementById("appointment-service").value = app.serviceId;
      document.getElementById("appointment-barber").value = app.barber;
      document.getElementById("appointment-status").value = app.status;
    }

    else if (action === "delete") {
      await deleteAppointmentFromFirestore(id);
      appointments = await getAppointmentsFromFirestore();
      renderAppointmentsTable();
      refreshAll();
    }
  });

  //Whats app

  document.getElementById("appointments-table-body").addEventListener("click", e => {
    if (!e.target.classList.contains("whatsapp-btn")) return;

    const id = e.target.dataset.id;
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const client = clients.find(c => c.id === app.clientId);
    if (!client || !client.phone) {
      alert("Este cliente no tiene número de teléfono registrado.");
      return;
    }

    // Convertir fecha y hora a formato legible
    const fecha = formatDateMMDDYYYY(app.date);
    const hora = formatTimeTo12Hour(app.time);

    // Mensaje prellenado
    const mensaje = encodeURIComponent(
      `Hola ${client.name}, te recordamos tu cita hoy a las ${hora}. ¡Te esperamos!`
    );

    // Número en formato internacional (asumiendo USA +1)
    const telefono = client.phone.replace(/\D/g, ""); // limpiar caracteres
    const whatsappURL = `https://wa.me/1${telefono}?text=${mensaje}`;

    // Abrir WhatsApp
    window.open(whatsappURL, "_blank");
  });





  document.getElementById("appointments-filter-btn").addEventListener("click", () => {
    const date = document.getElementById("appointments-filter-date").value;
    renderAppointmentsTable(date || null);
  });

  // ============================
  // REPORTES
  // ============================

  document.getElementById("report-generate-btn").addEventListener("click", () => {
    const fromDate = document.getElementById("report-from-date").value;
    const toDate = document.getElementById("report-to-date").value;

    const r = generateIncomeReport(fromDate, toDate);

    const reportDiv = document.getElementById("report-income-summary");

    reportDiv.innerHTML = `
      Citas completadas: ${r.citasCount}, Ingresos: $${r.citasTotal.toFixed(2)}<br>
      Walk-in: ${r.walkinCount}, Ingresos: $${r.walkinTotal.toFixed(2)}<br>
      <strong>Total general: $${r.totalGeneral.toFixed(2)}</strong>
    `;
  });

  // ============================
  // CONFIGURACIÓN
  // ============================

  document.getElementById("settings-start-time").value = settings.startTime || "";
  document.getElementById("settings-end-time").value = settings.endTime || "";

  document.getElementById("settings-save-btn").addEventListener("click", async () => {
    const startTime = document.getElementById("settings-start-time").value;
    const endTime = document.getElementById("settings-end-time").value;

    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para guardar configuración.");
      return;
    }

    await db.collection("users")
            .doc(user.uid)
            .collection("settings")
            .doc("workHours")
            .set({
              startTime,
              endTime
            });

    alert("Configuración guardada.");
  });


  // ============================
  // MODAL CORTE RÁPIDO
  // ============================

  document.getElementById("walkin-btn").addEventListener("click", () => {
    document.getElementById("walkin-modal").classList.remove("hidden");
  });

  document.getElementById("walkin-close-btn").addEventListener("click", () => {
    document.getElementById("walkin-modal").classList.add("hidden");
  });

  document.getElementById("walkin-save-btn").addEventListener("click", () => {

    const clientId = document.getElementById("walkin-client").value || null;
    const serviceId = document.getElementById("walkin-service").value;
    const barber = document.getElementById("walkin-barber").value.trim();
    const notes = document.getElementById("walkin-notes").value.trim();

    const service = services.find(s => s.id == serviceId);
    const price = service ? service.price : 0;

    const time = new Date().toTimeString().slice(0, 5);

    addWalkinCut({ clientId, serviceId, barber, time, price, notes });

    document.getElementById("walkin-modal").classList.add("hidden");

    renderCutsToday();
    renderCutsHistory();
  });

  // ============================
  // SELECTS DEL MODAL DE CORTES
  // ============================

  function fillWalkinSelects() {
    const clientSel = document.getElementById("walkin-client");
    const serviceSel = document.getElementById("walkin-service");

    clientSel.innerHTML = `<option value="">Walk-in (sin registro)</option>`;
    clients.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      clientSel.appendChild(opt);
    });

    serviceSel.innerHTML = "";
    services.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} ($${s.price})`;
      serviceSel.appendChild(opt);
    });
  }

  fillWalkinSelects();

  // ============================
  // REFRESCOS AUTOMÁTICOS
  // ============================

  setInterval(() => {
    refreshQuickAlerts();
  }, 1000);

  setInterval(() => {
    refreshNewClientsToday();
  }, 1000);

  renderServicesTable();

});

auth.onAuthStateChanged(async user => {
  if (user) {

    // Leer Firestore SIEMPRE
    const userDoc = await db.collection("users").doc(user.uid).get();
    const data = userDoc.data();

    // Si existe username, úsalo; si no, usa el email
    const username = data?.username || user.email.split("@")[0];

    document.getElementById("logged-user-name").textContent = username;

    // Ocultar pantalla de login
    document.getElementById("auth-screen").style.display = "none";

  } else {

    document.getElementById("logged-user-name").textContent = "";
    document.getElementById("auth-screen").style.display = "flex";

  }
});

  
// ============================
// REFRESH GENERAL
// ============================

function refreshAll() {
  renderClientsTable();
  renderServicesTable();
  renderInventoryTable();
  renderClientsSelect();
  renderServicesSelect();
  renderAppointmentsTable();
  renderCutsToday();
  renderCutsHistory();
  renderDashboard();
  renderReports();
}

// ============================
// HISTORIAL DE CORTES
// ============================

document.getElementById("clear-cuts-history-btn").addEventListener("click", async () => {
  if (!confirm("¿Borrar TODO el historial de cortes?")) return;

  await clearWalkinCutsFirestore();
  walkinCuts = await getWalkinCutsFromFirestore();

  renderCutsHistory();
  renderCutsToday();
  renderDashboardIncome();
});

document.getElementById("cuts-history-table").addEventListener("click", e => {
  if (e.target.classList.contains("delete-cut-btn")) {
    const id = e.target.dataset.id;
    deleteCut(id);
    renderCutsHistory();
    renderCutsToday();
  }
});

document.addEventListener("click", async function(e) {
  if (!e.target.classList.contains("delete-cut-btn")) return;

  const id = e.target.dataset.id;
  const type = e.target.dataset.type;

  if (type === "walkin") {
    await deleteWalkinCutFromFirestore(id);
    walkinCuts = await getWalkinCutsFromFirestore();
  }

  if (type === "cita") {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const updated = { ...app, status: "programada" };
    await saveAppointmentToFirestore(updated);
    appointments = await getAppointmentsFromFirestore();
  }

  renderCutsHistory();
  renderCutsToday();
  renderDashboardIncome();
});


// ============================
// SERVICIOS POR DEFECTO
// ============================

const defaultServices = [
  { id: 1, name: "Low Fade", duration: 30, price: 30, active: true },
  { id: 2, name: "Taper Fade", duration: 30, price: 30, active: true },
  { id: 3, name: "High Fade", duration: 30, price: 30, active: true },
  { id: 4, name: "Spiky Hair", duration: 30, price: 30, active: true },
  { id: 5, name: "Pompadour", duration: 45, price: 40, active: true },
  { id: 6, name: "Faux Hawk", duration: 30, price: 30, active: true },
  { id: 7, name: "Undercut", duration: 40, price: 35, active: true },
  { id: 8, name: "Textured Crop", duration: 30, price: 30, active: true },
  { id: 9, name: "Quiff", duration: 40, price: 35, active: true },
  { id: 10, name: "Hard Part", duration: 30, price: 30, active: true },
  { id: 11, name: "Crew Cut", duration: 20, price: 25, active: true },
  { id: 12, name: "Low Cut", duration: 20, price: 25, active: true },
  { id: 13, name: "Drop Fade", duration: 30, price: 30, active: true },
  { id: 14, name: "Burst Fade", duration: 30, price: 30, active: true },
  { id: 15, name: "Comb Over", duration: 40, price: 35, active: true },
  { id: 16, name: "Fringe Crop Fade", duration: 30, price: 30, active: true },
  { id: 17, name: "Curly High Fade", duration: 40, price: 35, active: true },
  { id: 18, name: "High Top Fade", duration: 40, price: 35, active: true },
  { id: 19, name: "Box Fade", duration: 40, price: 35, active: true },
  { id: 20, name: "Mid Skin Fade", duration: 30, price: 30, active: true },
  { id: 21, name: "Buzz Cut with Fade", duration: 20, price: 25, active: true },
  { id: 22, name: "Classic Taper Fade", duration: 30, price: 30, active: true },
  { id: 23, name: "Skin Fade with Short Curls", duration: 40, price: 35, active: true },
  { id: 24, name: "Shadow Fade", duration: 30, price: 30, active: true },
  { id: 25, name: "Razor Fade", duration: 40, price: 40, active: true },
  { id: 26, name: "Temple Fade", duration: 30, price: 30, active: true },
  { id: 27, name: "Mohawk Fade", duration: 40, price: 40, active: true },
  { id: 28, name: "Blowout Fade", duration: 35, price: 35, active: true },
  { id: 29, name: "French Crop", duration: 30, price: 30, active: true },
  { id: 30, name: "Edgar Cut", duration: 30, price: 30, active: true },
  { id: 31, name: "Mullet Moderno", duration: 40, price: 40, active: true },
  { id: 32, name: "Caesar Cut", duration: 25, price: 25, active: true },
  { id: 33, name: "Line Up + Fade", duration: 30, price: 30, active: true },
  { id: 34, name: "Fade con Diseño", duration: 45, price: 45, active: true },
  { id: 35, name: "Afro Shape Up", duration: 40, price: 40, active: true },
  { id: 36, name: "Waves + Shape Up", duration: 35, price: 35, active: true },
  { id: 37, name: "Corte de Mujer Largo", duration: 45, price: 45, active: true },
  { id: 38, name: "Corte de Mujer Medio", duration: 40, price: 40, active: true },
  { id: 39, name: "Corte de Mujer Corto", duration: 35, price: 35, active: true },
  { id: 40, name: "Capas Largas", duration: 45, price: 45, active: true },
  { id: 41, name: "Capas Medias", duration: 40, price: 40, active: true },
  { id: 42, name: "Fleco / Bangs", duration: 20, price: 20, active: true },
  { id: 43, name: "Blowout Mujer", duration: 45, price: 45, active: true },
  { id: 44, name: "Plancha / Straight Hair", duration: 40, price: 40, active: true },
  { id: 45, name: "Rizos con Tenaza", duration: 45, price: 45, active: true },
  { id: 46, name: "Peinado Elegante", duration: 60, price: 60, active: true },
  { id: 47, name: "Peinado Casual", duration: 40, price: 40, active: true },
  { id: 48, name: "Tinte Completo", duration: 120, price: 120, active: true },
  { id: 49, name: "Retoque de Raíz", duration: 60, price: 60, active: true },
  { id: 50, name: "Balayage", duration: 150, price: 150, active: true },
  { id: 51, name: "Mechas / Highlights", duration: 120, price: 120, active: true },
  { id: 52, name: "Matiz / Toner", duration: 45, price: 45, active: true },
  { id: 53, name: "Tratamiento Capilar", duration: 45, price: 45, active: true },
  { id: 54, name: "Botox Capilar", duration: 90, price: 90, active: true },
  { id: 55, name: "Keratina", duration: 120, price: 150, active: true },
  { id: 56, name: "Depilación de Cejas", duration: 15, price: 15, active: true },
  { id: 57, name: "Test1", duration: 15, price: 15, active: true }
];

renderServicesSelect();
renderServicesTable();


// ============================
// FOTOS DE SERVICIOS
// ============================

const servicePhotos = [
  { name: "Foto1", url: "Man1.png" },
  { name: "Foto2", url: "Man2.png" },
  { name: "Foto3", url: "Man3.png" },
  { name: "Foto4", url: "Woman1.png" }
];

function renderServicePhotos() {
  const container = document.getElementById("service-photos-container");
  container.innerHTML = "";

  servicePhotos.forEach(photo => {
    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${photo.url}" alt="${photo.name}" class="photo-thumb">
      <p>${photo.name}</p>
    `;
    div.querySelector("img").addEventListener("click", () => {
      openPhotoModal(photo);
    });
    container.appendChild(div);
  });
}

function openPhotoModal(photo) {
  const modal = document.getElementById("photo-modal");
  const modalImg = document.getElementById("photo-modal-img");
  const modalName = document.getElementById("photo-modal-name");

  modalImg.src = photo.url;
  modalName.textContent = photo.name;

  modal.style.display = "flex";
}

document.getElementById("photo-modal-close").addEventListener("click", () => {
  document.getElementById("photo-modal").style.display = "none";
});

document.getElementById("photo-modal").addEventListener("click", (e) => {
  if (e.target.id === "photo-modal") {
    document.getElementById("photo-modal").style.display = "none";
  }
});


// ============================
// FOTOS ANTES / DESPUÉS CLIENTES
// ============================

let currentPhotoClientId = null;
let currentPhotoType = null;

document.addEventListener("click", e => {
  if (e.target.classList.contains("photo-before-btn")) {
    openClientPhotoModal(e.target.dataset.id, "before");
  }
  if (e.target.classList.contains("photo-after-btn")) {
    openClientPhotoModal(e.target.dataset.id, "after");
  }
});

function openClientPhotoModal(clientId, type) {
  currentPhotoClientId = clientId;
  currentPhotoType = type;

  const client = clients.find(c => c.id === clientId);

  document.getElementById("client-photo-title").textContent =
    type === "before" ? "Foto ANTES" : "Foto DESPUÉS";

  const img = document.getElementById("client-photo-img");
  img.src = client[type === "before" ? "photoBefore" : "photoAfter"] || "";

  document.getElementById("client-photo-modal").style.display = "flex";
}

document.getElementById("client-photo-save").addEventListener("click", async () => {
  const fileInput = document.getElementById("client-photo-input");
  const file = fileInput.files[0];

  if (!file) return alert("Selecciona una foto primero.");

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;

    const client = clients.find(c => c.id === currentPhotoClientId);

    if (currentPhotoType === "before") {
      client.photoBefore = base64;
    } else {
      client.photoAfter = base64;
    }

    await saveClientToFirestore(client);
    clients = await getClientsFromFirestore();

    closeClientPhotoModal();
    renderClientsTable();
  };

  reader.readAsDataURL(file);
});

document.getElementById("client-photo-delete").addEventListener("click", async () => {
  const client = clients.find(c => c.id === currentPhotoClientId);

  if (currentPhotoType === "before") {
    client.photoBefore = null;
  } else {
    client.photoAfter = null;
  }

  await saveClientToFirestore(client);
  clients = await getClientsFromFirestore();

  closeClientPhotoModal();
  renderClientsTable();
});

function closeClientPhotoModal() {
  document.getElementById("client-photo-modal").style.display = "none";
}

document.getElementById("client-photo-close").addEventListener("click", closeClientPhotoModal);


// ============================
// ACCESOS DIRECTOS DEL DASHBOARD
// ============================

document.getElementById("dashboard-new-appointment-btn")
  .addEventListener("click", () => {
    switchTab("appointments");
  });

document.querySelectorAll(".shortcut-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

function checkUpcomingAppointments() {
  if (!appointments || !Array.isArray(appointments)) return;

  const now = new Date();

  appointments.forEach(app => {
    if (app.status !== "programada") return;

    const appDateTime = new Date(`${app.date}T${app.time}`);

    // Diferencia en minutos
    const diffMinutes = (appDateTime - now) / 60000;

    // Si falta entre 59 y 61 minutos → enviar recordatorio
    if (diffMinutes > 59 && diffMinutes < 61) {

      const client = clients.find(c => c.id === app.clientId);
      if (!client || !client.phone) return;

      const hora = formatTimeTo12Hour(app.time);

      const mensaje = encodeURIComponent(
        `Hola ${client.name}, te recordamos tu cita hoy a las ${hora}. ¡Te esperamos!`
      );

      const telefono = client.phone.replace(/\D/g, "");
      const whatsappURL = `https://wa.me/1${telefono}?text=${mensaje}`;

      // Abrir WhatsApp automáticamente
      window.open(whatsappURL, "_blank");
    }
  });
}

// Functions para detectar dates and times available for appointments

document.getElementById("appointment-date").addEventListener("change", () => {
  const date = document.getElementById("appointment-date").value;
  if (!date) return;
  showAvailableSlots(date);
});

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function getAppointmentsForDay(dateStr) {
  return appointments
    .filter(a => a.date === dateStr)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}


function showAvailableSlots(dateStr) {
  const slotsDiv = document.getElementById("appointment-slots");
  slotsDiv.innerHTML = "";

  // Horario configurado
  const startTime = document.getElementById("settings-start-time").value;
  const endTime = document.getElementById("settings-end-time").value;

  if (!startTime || !endTime) {
    slotsDiv.textContent = "Configura tu horario primero.";
    slotsDiv.style.color = "red";
    return;
  }

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  // Citas del día
  const dayApps = getAppointmentsForDay(dateStr);

  // Construir lista de intervalos ocupados
  const busy = dayApps.map(app => {
    const service = services.find(s => s.id === app.serviceId);
    const duration = service ? Number(service.duration) : 0;
    const appStart = toMinutes(app.time);
    const appEnd = appStart + duration;
    return { start: appStart, end: appEnd };
  });

  // Buscar huecos
  let freeSlots = [];
  let cursor = start;

  busy.forEach(b => {
    if (cursor < b.start) {
      freeSlots.push({ start: cursor, end: b.start });
    }
    cursor = Math.max(cursor, b.end);
  });

  // Último hueco del día
  if (cursor < end) {
    freeSlots.push({ start: cursor, end: end });
  }

  // Mostrar huecos
  if (freeSlots.length === 0) {
    slotsDiv.textContent = "Día lleno — no queda tiempo disponible.";
    slotsDiv.style.color = "red";
    return;
  }

  slotsDiv.style.color = "green";
  slotsDiv.innerHTML = "Huecos disponibles:<br>";

  freeSlots.forEach(slot => {
      const slotMinutes = slot.end - slot.start;

      const sH = String(Math.floor(slot.start / 60)).padStart(2, "0");
      const sM = String(slot.start % 60).padStart(2, "0");
      const eH = String(Math.floor(slot.end / 60)).padStart(2, "0");
      const eM = String(slot.end % 60).padStart(2, "0");

      const label = `${sH}:${sM} – ${eH}:${eM} · Minutos disponibles: ${slotMinutes}`;

      // ============================
      // REGLAS DE NEGOCIO
      // ============================

      if (slotMinutes < 20) {
          // Hueco demasiado pequeño
          slotsDiv.innerHTML += `<span style="color:red;">• ${label} (No hay cupo)</span><br>`;
      }
      else if (slotMinutes >= 20 && slotMinutes < 30) {
          // Hueco ajustado
          slotsDiv.innerHTML += `<span style="color:#cc0000;">• ${label} (Disponible pero ajustado)</span><br>`;
      }
      else {
          // Hueco normal
          slotsDiv.innerHTML += `• ${label}<br>`;
      }
  });

}
