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
      const service = services.find(s => s.id === id);
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

    const service = services.find(s => s.id === serviceId);
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
