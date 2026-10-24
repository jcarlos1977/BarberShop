// =====================================================
// main.js — Login, eventos y flujo de la aplicación
// =====================================================

let timers = [];
let pendingAuthMessage = "";

document.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  setupNavigation();
  setupDashboard();
  setupClients();
  setupAppointments();
  setupWalkins();
  setupCuts();
  setupServices();
  setupInventory();
  setupReports();
  setupSettings();
  setupServicePhotos();
  setupClientPhotos();
  setupCalendar();
});

// =====================================================
// PANTALLAS
// =====================================================
function showLoading(text = "Cargando...") {
  document.getElementById("loading-text").textContent = text;
  document.getElementById("loading-screen").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-screen").classList.add("hidden");
}

function showLogin(message = "") {
  hideLoading();
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("auth-error").textContent = message;
  document.getElementById("auth-password").value = "";
}

function showApp() {
  hideLoading();
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
}

function startTimers() {
  stopTimers();
  // Alertas cada 30 segundos
  timers.push(setInterval(() => {
    renderQuickAlerts();
    renderNewClientsToday();
    renderHeaderStats();
  }, 30000));
  // Todo cada 5 minutos (por si cambia el día, citas retrasadas, etc.)
  timers.push(setInterval(() => refreshAll(), 5 * 60 * 1000));
}

function stopTimers() {
  timers.forEach(clearInterval);
  timers = [];
}

function barberDefault() {
  return (currentUsername || "").toUpperCase();
}

// =====================================================
// LOGIN / LOGOUT
// =====================================================
function setupAuth() {
  auth.onAuthStateChanged(async user => {
    stopTimers();

    if (!user) {
      clearAllData();
      showLogin(pendingAuthMessage);
      pendingAuthMessage = "";
      return;
    }

    showLoading("Cargando tus datos...");

    try {
      currentUsername = await loadProfile(user);
      document.getElementById("logged-user-name").textContent = currentUsername;

      await loadAllData();

      refreshAll();
      resetClientForm();
      resetAppointmentForm();
      resetServiceForm();
      resetInventoryForm();
      fillSettingsForm();
      setDefaultReportDates();
      switchTab("dashboard");

      showApp();
      startTimers();
    } catch (err) {
      console.error("Error cargando datos:", err);
      pendingAuthMessage = "No se pudieron cargar tus datos. Intenta de nuevo.";
      await auth.signOut();
    }
  });

  document.getElementById("auth-form").addEventListener("submit", async e => {
    e.preventDefault();

    const input = document.getElementById("auth-username").value.trim();
    const password = document.getElementById("auth-password").value;
    const errorDiv = document.getElementById("auth-error");
    const button = document.getElementById("auth-login-btn");

    errorDiv.textContent = "";

    if (!input || !password) {
      errorDiv.textContent = "Escribe tu usuario y tu contraseña.";
      return;
    }

    setBusy(button, true, "Entrando...");

    try {
      const email = await resolveLoginEmail(input);
      if (!email) {
        errorDiv.textContent = "Usuario no encontrado. Si es la primera vez con esta versión, entra con tu correo.";
        return;
      }
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      console.error("Login error:", err);
      errorDiv.textContent = loginErrorMessage(err);
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    stopTimers();
    await auth.signOut();
  });
}

function loginErrorMessage(err) {
  const code = err && err.code ? err.code : "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found",
       "auth/invalid-login-credentials", "auth/invalid-email"].includes(code)) {
    return "Usuario o contraseña incorrectos.";
  }
  if (code === "auth/too-many-requests") {
    return "Demasiados intentos. Espera unos minutos e inténtalo otra vez.";
  }
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return "Sin conexión a internet. Revisa tu conexión.";
  }
  if (code === "permission-denied") {
    return "No se pudo verificar el usuario. Intenta entrar con tu correo.";
  }
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

// =====================================================
// NAVEGACIÓN
// =====================================================
function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

// =====================================================
// DASHBOARD
// =====================================================
function setupDashboard() {
  document.getElementById("dashboard-new-appointment-btn").addEventListener("click", () => {
    resetAppointmentForm();
    switchTab("appointments");
    document.getElementById("appointment-time").focus();
  });

  document.getElementById("dashboard-quick-alerts").addEventListener("click", e => {
    const btn = e.target.closest("button[data-action='whatsapp']");
    if (btn) sendWhatsAppReminder(btn.dataset.id);
  });
}

function sendWhatsAppReminder(appointmentId) {
  const app = findAppointment(appointmentId);
  if (!app) return;

  const client = findClient(app.clientId);
  if (!client || !client.phone) {
    showToast("Este cliente no tiene número de teléfono registrado.", "error");
    return;
  }

  const url = buildWhatsAppUrl(client.phone, reminderMessage(app));
  if (!url) {
    showToast("El número de teléfono no es válido.", "error");
    return;
  }
  window.open(url, "_blank");
}

// =====================================================
// CLIENTES
// =====================================================
function resetClientForm() {
  document.getElementById("client-form").reset();
  document.getElementById("client-id").value = "";
  document.getElementById("client-form-title").textContent = "Nuevo cliente";
}

function setupClients() {
  const form = document.getElementById("client-form");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("client-id").value || null;
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const notes = document.getElementById("client-notes").value.trim();
    const vip = document.getElementById("client-vip").checked;

    if (!name || !phone) {
      showToast("El nombre y el teléfono son obligatorios.", "error");
      return;
    }

    const existing = findClient(id);
    const button = form.querySelector("button[type='submit']");
    setBusy(button, true);

    try {
      await saveClient({
        id,
        name,
        phone,
        notes,
        vip,
        // Al editar se conserva la fecha original de registro
        createdDate: existing && existing.createdDate ? existing.createdDate : todayStr()
      });
      resetClientForm();
      refreshAll();
      showToast(id ? "Cliente actualizado." : "Cliente guardado.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar el cliente.", "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("client-form-reset").addEventListener("click", resetClientForm);
  document.getElementById("client-search").addEventListener("input", renderClientsTable);

  document.getElementById("clients-table-body").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const client = findClient(id);
    if (!client) return;

    switch (btn.dataset.action) {
      case "edit":
        document.getElementById("client-id").value = client.id;
        document.getElementById("client-name").value = client.name || "";
        document.getElementById("client-phone").value = client.phone || "";
        document.getElementById("client-notes").value = client.notes || "";
        document.getElementById("client-vip").checked = !!client.vip;
        document.getElementById("client-form-title").textContent = "Editar cliente";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        break;

      case "delete":
        if (!confirm(`¿Eliminar a ${client.name}? También se borrarán sus fotos.`)) return;
        try {
          await deleteClient(id);
          refreshAll();
          showToast("Cliente eliminado.");
        } catch (err) {
          console.error(err);
          showToast("No se pudo eliminar el cliente.", "error");
        }
        break;

      case "photo-before":
        openClientPhotoModal(id, "before");
        break;

      case "photo-after":
        openClientPhotoModal(id, "after");
        break;
    }
  });
}

// =====================================================
// CITAS
// =====================================================
function resetAppointmentForm(dateStr = todayStr()) {
  document.getElementById("appointment-form").reset();
  document.getElementById("appointment-id").value = "";
  document.getElementById("appointment-form-title").textContent = "Nueva cita";
  document.getElementById("appointment-date").value = dateStr;
  document.getElementById("appointment-barber").value = barberDefault();
  document.getElementById("appointment-status").value = "programada";
  document.getElementById("appointment-price").value = "";
  renderServicesSelect();
  renderSlots(dateStr);
}

function setupAppointments() {
  const form = document.getElementById("appointment-form");

  // Al elegir servicio se llena el precio (se puede cambiar)
  document.getElementById("appointment-service").addEventListener("change", e => {
    const service = findService(e.target.value);
    document.getElementById("appointment-price").value = service ? toNumber(service.price) : "";
  });

  document.getElementById("appointment-date").addEventListener("change", e => {
    renderSlots(e.target.value, document.getElementById("appointment-id").value || null);
  });

  // Tocar un hueco disponible llena la hora
  document.getElementById("appointment-slots").addEventListener("click", e => {
    const slot = e.target.closest("[data-time]");
    if (!slot) return;
    document.getElementById("appointment-time").value = slot.dataset.time;
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("appointment-id").value || null;
    const date = document.getElementById("appointment-date").value;
    const time = document.getElementById("appointment-time").value;
    const clientId = document.getElementById("appointment-client").value;
    const serviceId = document.getElementById("appointment-service").value;
    const barber = document.getElementById("appointment-barber").value.trim();
    const status = document.getElementById("appointment-status").value;
    const priceInput = document.getElementById("appointment-price").value;

    if (!date || !time || !clientId || !serviceId || !barber) {
      showToast("Llena fecha, hora, cliente, servicio y barbero.", "error");
      return;
    }

    const service = findService(serviceId);
    const price = priceInput === "" ? (service ? toNumber(service.price) : 0) : toNumber(priceInput, NaN);
    if (!Number.isFinite(price) || price < 0) {
      showToast("El precio no es válido.", "error");
      return;
    }

    if (status !== "cancelada") {
      const overlap = findOverlappingAppointment(date, time, serviceId, id);
      if (overlap && !confirm(
        `Esta cita se cruza con otra a las ${formatTimeTo12Hour(overlap.time)} (${clientName(overlap.clientId)}). ¿Guardarla de todos modos?`
      )) return;
    }

    const button = form.querySelector("button[type='submit']");
    setBusy(button, true);

    try {
      await saveAppointment({ id, date, time, clientId, serviceId, barber, status, price });
      refreshAll();
      resetAppointmentForm(date);
      showToast(id ? "Cita actualizada." : "Cita guardada.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar la cita.", "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("appointment-form-reset").addEventListener("click", () => resetAppointmentForm());

  // Acciones de la tabla
  document.getElementById("appointments-table-body").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const app = findAppointment(btn.dataset.id);
    if (!app) return;

    switch (btn.dataset.action) {
      case "edit":
        fillAppointmentForm(app);
        break;

      case "complete":
        try {
          await saveAppointment({ ...app, status: "completada" });
          refreshAll();
          showToast("Cita marcada como completada.");
        } catch (err) {
          console.error(err);
          showToast("No se pudo actualizar la cita.", "error");
        }
        break;

      case "whatsapp":
        sendWhatsAppReminder(app.id);
        break;

      case "delete":
        if (!confirm(`¿Eliminar la cita de ${clientName(app.clientId, "este cliente")} del ${formatDateMMDDYYYY(app.date)}?`)) return;
        try {
          await deleteAppointment(app.id);
          refreshAll();
          showToast("Cita eliminada.");
        } catch (err) {
          console.error(err);
          showToast("No se pudo eliminar la cita.", "error");
        }
        break;
    }
  });

  // Filtros
  document.getElementById("appointments-filter-date").addEventListener("change", renderAppointmentsTable);
  document.getElementById("appointments-filter-clear").addEventListener("click", () => {
    document.getElementById("appointments-filter-date").value = "";
    renderAppointmentsTable();
  });
  document.getElementById("appointment-search").addEventListener("input", renderAppointmentsTable);
  ["programada", "completada", "cancelada"].forEach(status => {
    document.getElementById(`filter-status-${status}`).addEventListener("change", renderAppointmentsTable);
  });
}

function fillAppointmentForm(app) {
  renderServicesSelect();
  ensureServiceOption("appointment-service", app.serviceId);

  document.getElementById("appointment-id").value = app.id;
  document.getElementById("appointment-date").value = app.date || "";
  document.getElementById("appointment-time").value = app.time || "";
  document.getElementById("appointment-client").value = app.clientId || "";
  document.getElementById("appointment-service").value = app.serviceId || "";
  document.getElementById("appointment-barber").value = app.barber || barberDefault();
  document.getElementById("appointment-status").value = app.status || "programada";
  document.getElementById("appointment-price").value = getItemPrice(app);
  document.getElementById("appointment-form-title").textContent = "Editar cita";

  renderSlots(app.date, app.id);
  document.getElementById("appointment-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

// =====================================================
// CORTE RÁPIDO (WALK-IN)
// =====================================================
function openWalkinModal() {
  renderClientsSelect();
  renderServicesSelect();

  document.getElementById("walkin-client").value = "";
  document.getElementById("walkin-service").value = "";
  document.getElementById("walkin-price").value = "";
  document.getElementById("walkin-barber").value = barberDefault();
  document.getElementById("walkin-notes").value = "";

  showModal("walkin-modal");
}

function setupWalkins() {
  document.getElementById("walkin-btn").addEventListener("click", openWalkinModal);

  const close = () => hideModal("walkin-modal");
  document.getElementById("walkin-close-btn").addEventListener("click", close);
  document.getElementById("walkin-cancel-btn").addEventListener("click", close);
  document.getElementById("walkin-modal").addEventListener("click", e => {
    if (e.target.id === "walkin-modal") close();
  });

  document.getElementById("walkin-service").addEventListener("change", e => {
    const service = findService(e.target.value);
    document.getElementById("walkin-price").value = service ? toNumber(service.price) : "";
  });

  document.getElementById("walkin-save-btn").addEventListener("click", async e => {
    const clientId = document.getElementById("walkin-client").value || null;
    const serviceId = document.getElementById("walkin-service").value;
    const barber = document.getElementById("walkin-barber").value.trim();
    const notes = document.getElementById("walkin-notes").value.trim();
    const priceInput = document.getElementById("walkin-price").value;

    if (!serviceId) {
      showToast("Selecciona un servicio.", "error");
      return;
    }

    const service = findService(serviceId);
    const price = priceInput === "" ? (service ? toNumber(service.price) : 0) : toNumber(priceInput, NaN);
    if (!Number.isFinite(price) || price < 0) {
      showToast("El precio no es válido.", "error");
      return;
    }

    const button = e.currentTarget;
    setBusy(button, true);

    try {
      await saveWalkinCut({
        clientId,
        serviceId,
        barber,
        notes,
        price,
        date: todayStr(),
        time: nowHHMM()
      });
      close();
      refreshAll();
      showToast("Corte registrado.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar el corte.", "error");
    } finally {
      setBusy(button, false);
    }
  });
}

// =====================================================
// CORTES (HISTORIAL)
// =====================================================
function setupCuts() {
  document.getElementById("cuts-filter-date").addEventListener("change", renderCutsHistory);
  document.getElementById("cuts-filter-clear").addEventListener("click", () => {
    document.getElementById("cuts-filter-date").value = "";
    renderCutsHistory();
  });
  document.getElementById("cuts-search").addEventListener("input", renderCutsHistory);

  // Un solo listener para eliminar (antes había dos y se ejecutaba doble)
  document.getElementById("cuts-history-table").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action='delete-cut']");
    if (!btn) return;

    const id = btn.dataset.id;
    const type = btn.dataset.type;

    try {
      if (type === "walkin") {
        if (!confirm("¿Eliminar este corte rápido?")) return;
        await deleteWalkinCut(id);
        showToast("Corte eliminado.");
      } else {
        const app = findAppointment(id);
        if (!app) return;
        if (!confirm("Esta cita volverá a quedar como \"Programada\" y saldrá del historial. ¿Continuar?")) return;
        await saveAppointment({ ...app, status: "programada" });
        showToast("La cita volvió a Programada.");
      }
      refreshAll();
    } catch (err) {
      console.error(err);
      showToast("No se pudo eliminar.", "error");
    }
  });

  document.getElementById("clear-cuts-history-btn").addEventListener("click", async e => {
    if (!walkinCuts.length) {
      showToast("No hay cortes rápidos para borrar.", "info");
      return;
    }
    if (!confirm(`¿Borrar los ${walkinCuts.length} cortes rápidos? Las citas completadas no se borran. Esto no se puede deshacer.`)) return;

    const button = e.currentTarget;
    setBusy(button, true, "Borrando...");
    try {
      await clearWalkinCuts();
      refreshAll();
      showToast("Cortes rápidos borrados.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo borrar el historial.", "error");
    } finally {
      setBusy(button, false);
    }
  });
}

// =====================================================
// SERVICIOS
// =====================================================
function resetServiceForm() {
  document.getElementById("service-form").reset();
  document.getElementById("service-id").value = "";
  document.getElementById("service-active").checked = true;
  document.getElementById("service-form-title").textContent = "Nuevo servicio";
}

function setupServices() {
  const form = document.getElementById("service-form");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("service-id").value || null;
    const name = document.getElementById("service-name").value.trim();
    const duration = parseInt(document.getElementById("service-duration").value, 10);
    const price = parseFloat(document.getElementById("service-price").value);
    const active = document.getElementById("service-active").checked;

    if (!name || isNaN(duration) || duration <= 0 || isNaN(price) || price < 0) {
      showToast("Revisa el nombre, la duración y el precio.", "error");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    setBusy(button, true);

    try {
      await saveService({ id, name, duration, price, active });
      resetServiceForm();
      refreshAll();
      showToast(id ? "Servicio actualizado." : "Servicio guardado.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar el servicio.", "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("service-form-reset").addEventListener("click", resetServiceForm);
  document.getElementById("service-search").addEventListener("input", renderServicesTable);

  document.getElementById("services-table-body").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const service = findService(btn.dataset.id);
    if (!service) return;

    if (btn.dataset.action === "edit") {
      document.getElementById("service-id").value = service.id;
      document.getElementById("service-name").value = service.name || "";
      document.getElementById("service-duration").value = toNumber(service.duration, 30);
      document.getElementById("service-price").value = toNumber(service.price);
      document.getElementById("service-active").checked = !!service.active;
      document.getElementById("service-form-title").textContent = "Editar servicio";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (btn.dataset.action === "delete") {
      if (!confirm(`¿Eliminar el servicio "${service.name}"? Si solo ya no lo ofreces, mejor desmárcalo como Activo.`)) return;
      try {
        await deleteService(service.id);
        refreshAll();
        showToast("Servicio eliminado.");
      } catch (err) {
        console.error(err);
        showToast("No se pudo eliminar el servicio.", "error");
      }
    }
  });
}

// =====================================================
// INVENTARIO
// =====================================================
function resetInventoryForm() {
  document.getElementById("inventory-form").reset();
  document.getElementById("inventory-id").value = "";
  document.getElementById("inventory-form-title").textContent = "Nuevo producto";
}

function setupInventory() {
  const form = document.getElementById("inventory-form");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("inventory-id").value || null;
    const name = document.getElementById("inventory-name").value.trim();
    const qty = parseInt(document.getElementById("inventory-qty").value, 10);
    const min = parseInt(document.getElementById("inventory-min").value, 10);
    const cost = parseFloat(document.getElementById("inventory-cost").value);

    if (!name || isNaN(qty) || isNaN(min) || isNaN(cost)) {
      showToast("Llena todos los campos del producto.", "error");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    setBusy(button, true);

    try {
      await saveInventoryItem({ id, name, qty, min, cost });
      resetInventoryForm();
      refreshAll();
      showToast(id ? "Producto actualizado." : "Producto guardado.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar el producto.", "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("inventory-form-reset").addEventListener("click", resetInventoryForm);
  document.getElementById("inventory-search").addEventListener("input", renderInventoryTable);

  document.getElementById("inventory-table-body").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const item = inventory.find(i => String(i.id) === String(btn.dataset.id));
    if (!item) return;

    if (btn.dataset.action === "edit") {
      document.getElementById("inventory-id").value = item.id;
      document.getElementById("inventory-name").value = item.name || "";
      document.getElementById("inventory-qty").value = toNumber(item.qty);
      document.getElementById("inventory-min").value = toNumber(item.min);
      document.getElementById("inventory-cost").value = toNumber(item.cost);
      document.getElementById("inventory-form-title").textContent = "Editar producto";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (btn.dataset.action === "delete") {
      if (!confirm(`¿Eliminar "${item.name}" del inventario?`)) return;
      try {
        await deleteInventoryItem(item.id);
        refreshAll();
        showToast("Producto eliminado.");
      } catch (err) {
        console.error(err);
        showToast("No se pudo eliminar el producto.", "error");
      }
    }
  });
}

// =====================================================
// REPORTES
// =====================================================
function setDefaultReportDates() {
  const today = todayStr();
  document.getElementById("report-from-date").value = today.slice(0, 8) + "01";
  document.getElementById("report-to-date").value = today;
  renderIncomeReport(today.slice(0, 8) + "01", today);
}

function setupReports() {
  document.getElementById("report-generate-btn").addEventListener("click", () => {
    const from = document.getElementById("report-from-date").value;
    const to = document.getElementById("report-to-date").value;

    if (from && to && from > to) {
      showToast("La fecha \"Desde\" no puede ser después de \"Hasta\".", "error");
      return;
    }
    renderIncomeReport(from, to);
  });
}

// =====================================================
// CONFIGURACIÓN
// =====================================================
function fillSettingsForm() {
  document.getElementById("settings-start-time").value = workHours.startTime || "";
  document.getElementById("settings-end-time").value = workHours.endTime || "";
}

function setupSettings() {
  document.getElementById("settings-save-btn").addEventListener("click", async e => {
    const startTime = document.getElementById("settings-start-time").value;
    const endTime = document.getElementById("settings-end-time").value;

    if (!startTime || !endTime) {
      showToast("Escribe la hora de inicio y la de cierre.", "error");
      return;
    }
    if (toMinutes(startTime) >= toMinutes(endTime)) {
      showToast("La hora de cierre debe ser después de la de inicio.", "error");
      return;
    }

    const button = e.currentTarget;
    setBusy(button, true);
    try {
      await saveWorkHours(startTime, endTime);
      renderSlots(document.getElementById("appointment-date").value,
                  document.getElementById("appointment-id").value || null);
      showToast("Configuración guardada.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo guardar la configuración.", "error");
    } finally {
      setBusy(button, false);
    }
  });
}

// =====================================================
// FOTOS DE SERVICIOS
// =====================================================
function setupServicePhotos() {
  document.getElementById("service-photos-container").addEventListener("click", e => {
    const card = e.target.closest(".photo-card");
    if (!card) return;
    const photo = SERVICE_PHOTOS[Number(card.dataset.index)];
    if (!photo) return;

    document.getElementById("photo-modal-img").src = photo.url;
    document.getElementById("photo-modal-img").alt = photo.name;
    document.getElementById("photo-modal-name").textContent = photo.name;
    showModal("photo-modal");
  });

  document.getElementById("photo-modal-close").addEventListener("click", () => hideModal("photo-modal"));
  document.getElementById("photo-modal").addEventListener("click", e => {
    if (e.target.id === "photo-modal") hideModal("photo-modal");
  });
}

// =====================================================
// FOTOS ANTES / DESPUÉS
// =====================================================
let currentPhoto = { clientId: null, type: null };

function showClientPhoto(src, emptyText = "Este cliente no tiene foto todavía.") {
  const img = document.getElementById("client-photo-img");
  const empty = document.getElementById("client-photo-empty");

  if (src) {
    img.src = src;
    img.classList.remove("hidden");
    empty.classList.add("hidden");
  } else {
    img.removeAttribute("src");
    img.classList.add("hidden");
    empty.textContent = emptyText;
    empty.classList.remove("hidden");
  }
}

async function openClientPhotoModal(clientId, type) {
  const client = findClient(clientId);
  if (!client) return;

  currentPhoto = { clientId, type };

  document.getElementById("client-photo-title").textContent =
    `${type === "before" ? "Foto ANTES" : "Foto DESPUÉS"} — ${client.name}`;
  document.getElementById("client-photo-input").value = "";
  showClientPhoto("", "Cargando...");
  showModal("client-photo-modal");

  try {
    const image = await getClientPhoto(clientId, type);
    // Por si el usuario cerró o abrió otra foto mientras cargaba
    if (currentPhoto.clientId === clientId && currentPhoto.type === type) {
      showClientPhoto(image);
    }
  } catch (err) {
    console.error(err);
    showClientPhoto("", "No se pudo cargar la foto.");
  }
}

function closeClientPhotoModal() {
  hideModal("client-photo-modal");
  currentPhoto = { clientId: null, type: null };
}

function setupClientPhotos() {
  document.getElementById("client-photo-close").addEventListener("click", closeClientPhotoModal);
  document.getElementById("client-photo-modal").addEventListener("click", e => {
    if (e.target.id === "client-photo-modal") closeClientPhotoModal();
  });

  // Vista previa al escoger archivo
  document.getElementById("client-photo-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) showClientPhoto(URL.createObjectURL(file));
  });

  document.getElementById("client-photo-save").addEventListener("click", async e => {
    const file = document.getElementById("client-photo-input").files[0];
    if (!file) {
      showToast("Selecciona una foto primero.", "error");
      return;
    }

    const { clientId, type } = currentPhoto;
    const button = e.currentTarget;
    setBusy(button, true, "Subiendo...");

    try {
      const dataUrl = await compressImage(file);
      await saveClientPhoto(clientId, type, dataUrl);
      closeClientPhotoModal();
      showToast("Foto guardada.");
    } catch (err) {
      console.error(err);
      showToast(err.message || "No se pudo guardar la foto.", "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("client-photo-delete").addEventListener("click", async e => {
    const { clientId, type } = currentPhoto;
    if (!clientId) return;
    if (!confirm("¿Eliminar esta foto?")) return;

    const button = e.currentTarget;
    setBusy(button, true, "Eliminando...");

    try {
      await deleteClientPhoto(clientId, type);
      closeClientPhotoModal();
      showToast("Foto eliminada.");
    } catch (err) {
      console.error(err);
      showToast("No se pudo eliminar la foto.", "error");
    } finally {
      setBusy(button, false);
    }
  });
}

// =====================================================
// CALENDARIO
// =====================================================
function setupCalendar() {
  document.getElementById("open-calendar-btn").addEventListener("click", () => {
    const now = new Date();
    calendarState.year = now.getFullYear();
    calendarState.month = now.getMonth();
    renderCalendar();
    hideModal("day-details-modal");
    showModal("calendar-modal");
  });

  document.getElementById("calendar-prev").addEventListener("click", () => {
    calendarState.month--;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year--;
    }
    renderCalendar();
  });

  document.getElementById("calendar-next").addEventListener("click", () => {
    calendarState.month++;
    if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year++;
    }
    renderCalendar();
  });

  document.getElementById("close-calendar").addEventListener("click", () => hideModal("calendar-modal"));

  document.getElementById("calendar-grid").addEventListener("click", e => {
    const day = e.target.closest("[data-date]");
    if (day) openDayDetails(day.dataset.date);
  });

  document.getElementById("close-day-details").addEventListener("click", () => {
    hideModal("day-details-modal");
    renderCalendar();
    showModal("calendar-modal");
  });

  makeCalendarModalsDraggable("calendar-modal", "day-details-modal", "calendar-modal-header");
  makeCalendarModalsDraggable("day-details-modal", "calendar-modal", "day-details-header");
}
