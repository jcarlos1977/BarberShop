// main.js

document.addEventListener("DOMContentLoaded", () => {

  // Navegación entre tabs
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
      refreshAll();
    });
  });

  // Inicialización general
  renderClientsTable();
  renderServicesTable();
  renderInventoryTable();
  renderClientsSelect();
  renderServicesSelect();
  renderAppointmentsTable();
  renderCutsToday();
  renderCutsHistory();
  refreshAll();


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

  document.addEventListener("click", function(e) {
    if (e.target.classList.contains("delete-client-btn")) {
      const id = e.target.dataset.id;

      clients = clients.filter(c => c.id !== id);
      saveToStorage("barber_app_clients", clients);

      renderClientsTable();
      renderDashboard(); // opcional si quieres actualizar el contador
    }
  });





  // ============================
  // FORMULARIO SERVICIOS
  // ============================

  const serviceForm = document.getElementById("service-form");

  serviceForm.addEventListener("submit", e => {
    e.preventDefault();

    const id = document.getElementById("service-id").value || null;
    const name = document.getElementById("service-name").value.trim();
    const duration = parseInt(document.getElementById("service-duration").value, 10);
    const price = parseFloat(document.getElementById("service-price").value);
    const active = document.getElementById("service-active").checked;

    if (!name || isNaN(duration) || isNaN(price)) return;

    addOrUpdateService({ id, name, duration, price, active });

    serviceForm.reset();
    document.getElementById("service-id").value = "";

    renderServicesTable();
    renderServicesSelect();
    refreshAll();
  });

  document.getElementById("service-form-reset").addEventListener("click", () => {
    serviceForm.reset();
    document.getElementById("service-id").value = "";
  });

  document.getElementById("services-table-body").addEventListener("click", e => {
    const btn = e.target;
    if (btn.tagName !== "BUTTON") return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      const service = services.find(s => s.id == id);
      if (!service) return;

      document.getElementById("service-id").value = service.id;
      document.getElementById("service-name").value = service.name;
      document.getElementById("service-duration").value = service.duration;
      document.getElementById("service-price").value = service.price;
      document.getElementById("service-active").checked = !!service.active;

    } else if (action === "delete") {
      deleteService(id);
      renderServicesTable();
      renderServicesSelect();
      refreshAll();
    }
  });



  // ============================
  // FORMULARIO INVENTARIO
  // ============================

  const inventoryForm = document.getElementById("inventory-form");

  inventoryForm.addEventListener("submit", e => {
    e.preventDefault();

    const id = document.getElementById("inventory-id").value || null;
    const name = document.getElementById("inventory-name").value.trim();
    const qty = parseInt(document.getElementById("inventory-qty").value, 10);
    const min = parseInt(document.getElementById("inventory-min").value, 10);
    const cost = parseFloat(document.getElementById("inventory-cost").value);

    if (!name || isNaN(qty) || isNaN(min) || isNaN(cost)) return;

    addOrUpdateInventoryItem({ id, name, qty, min, cost });

    inventoryForm.reset();
    document.getElementById("inventory-id").value = "";

    renderInventoryTable();
    refreshAll();
  });

  document.getElementById("inventory-form-reset").addEventListener("click", () => {
    inventoryForm.reset();
    document.getElementById("inventory-id").value = "";
  });

  document.getElementById("inventory-table-body").addEventListener("click", e => {
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

    } else if (action === "delete") {
      deleteInventoryItem(id);
      renderInventoryTable();
      refreshAll();
    }
  });



  // ============================
  // FORMULARIO CITAS
  // ============================

  const appointmentForm = document.getElementById("appointment-form");

  appointmentForm.addEventListener("submit", e => {
    e.preventDefault();

    const id = document.getElementById("appointment-id").value || null;
    const date = document.getElementById("appointment-date").value;
    const time = document.getElementById("appointment-time").value;
    const clientId = document.getElementById("appointment-client").value;
    const serviceId = document.getElementById("appointment-service").value;
    const barber = document.getElementById("appointment-barber").value.trim();
    const status = document.getElementById("appointment-status").value;

    if (!date || !time || !clientId || !serviceId || !barber) return;

    addOrUpdateAppointment({ id, date, time, clientId, serviceId, barber, status });

    appointmentForm.reset();
    document.getElementById("appointment-id").value = "";

    refreshAll();
  });

  document.getElementById("appointment-form-reset").addEventListener("click", () => {
    appointmentForm.reset();
    document.getElementById("appointment-id").value = "";
  });

  document.getElementById("appointments-table-body").addEventListener("click", e => {
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

    } else if (action === "delete") {
      deleteAppointment(id);
      refreshAll();
    }
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

  document.getElementById("settings-save-btn").addEventListener("click", () => {
    const startTime = document.getElementById("settings-start-time").value;
    const endTime = document.getElementById("settings-end-time").value;

    updateSettings({ startTime, endTime });

    alert("Configuración guardada.");
  });



  // ============================
  // MODAL CORTE RÁPIDO
  // ============================

  // Abrir modal
  document.getElementById("walkin-btn").addEventListener("click", () => {
    document.getElementById("walkin-modal").classList.remove("hidden");
  });

  // Cerrar modal
  document.getElementById("walkin-close-btn").addEventListener("click", () => {
    document.getElementById("walkin-modal").classList.add("hidden");
  });

  // Guardar corte
  document.getElementById("walkin-save-btn").addEventListener("click", () => {

    const clientId = document.getElementById("walkin-client").value || null;
    const serviceId = document.getElementById("walkin-service").value;
    const barber = document.getElementById("walkin-barber").value.trim();
    const notes = document.getElementById("walkin-notes").value.trim();

    const service = services.find(s => s.id == serviceId);
    const price = service ? service.price : 0;

    const time = new Date().toTimeString().slice(0, 5); // HH:MM

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


document.getElementById("clear-cuts-history-btn").addEventListener("click", () => {
  if (confirm("¿Borrar TODO el historial de cortes?")) {
    clearCutsHistory();
    renderCutsHistory();
    renderCutsToday();
  }
});

document.getElementById("cuts-history-table").addEventListener("click", e => {
  if (e.target.classList.contains("delete-cut-btn")) {
    const id = e.target.dataset.id;
    deleteCut(id);
    renderCutsHistory();
    renderCutsToday();
  }
});


document.addEventListener("click", function(e) {
  if (e.target.classList.contains("delete-cut-btn")) {
    const id = e.target.dataset.id;
    const type = e.target.dataset.type;

    if (type === "walkin") {
      walkinCuts = walkinCuts.filter(c => c.id !== id);
      saveToStorage("barber_app_walkin_cuts", walkinCuts);
    }

    if (type === "cita") {
      appointments = appointments.map(a =>
        a.id === id ? { ...a, status: "programada" } : a
      );
      saveToStorage("barber_app_appointments", appointments);
    }

    renderCutsHistory();
    renderCutsToday();
    renderDashboardIncome();
  }
});



const defaultServices = [
  // ============================
  // HOMBRES (36 servicios)
  // ============================
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

  // Nuevos (basados en tus fotos)
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

  // ============================
  // MUJERES (20 servicios)
  // ============================
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



let services = JSON.parse(localStorage.getItem("barber_app_services") || "[]");

// Mezclar defaultServices con los guardados
defaultServices.forEach(def => {
  const exists = services.some(s => s.id == def.id);
  if (!exists) {
    services.push(def); // agrega solo los nuevos
  }
});

// Guardar mezcla final
localStorage.setItem("barber_app_services", JSON.stringify(services));

// Renderizar
renderServicesSelect();
renderServicesTable();
            // ← NECESARIO
