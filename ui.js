// ui.js

function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === "tab-" + tabId);
  });
}

function renderClientsTable() {
  const tbody = document.getElementById("clients-table-body");
  tbody.innerHTML = "";

  clients.forEach(client => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${client.name}</td>
      <td>${client.phone}</td>
      <td>${client.vip ? "Sí" : "No"}</td>
      
      <td>
        <button class="small edit-client-btn" data-id="${client.id}">Editar</button>
        <button class="small delete-client-btn" data-id="${client.id}">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


function renderClientsSelect() {
  const select = document.getElementById("appointment-client");
  select.innerHTML = `<option value="">Selecciona cliente</option>`;
  clients.forEach(client => {
    const opt = document.createElement("option");
    opt.value = client.id;
    opt.textContent = client.name;
    select.appendChild(opt);
  });
}

function renderServicesTable() {
  const tbody = document.getElementById("services-table-body");
  tbody.innerHTML = "";
  services.forEach(service => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${service.name}</td>
      <td>${service.duration} min</td>
      <td>$${service.price.toFixed(2)}</td>
      <td>${service.active ? "Sí" : "No"}</td>
      <td>
        <button class="small" data-action="edit" data-id="${service.id}">Editar</button>
        <button class="small" data-action="delete" data-id="${service.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderServicesSelect() {
  const select = document.getElementById("appointment-service");
  select.innerHTML = `<option value="">Selecciona servicio</option>`;
  services
    .filter(s => s.active)
    .forEach(service => {
      const opt = document.createElement("option");
      opt.value = service.id;
      opt.textContent = `${service.name} ($${service.price.toFixed(2)})`;
      select.appendChild(opt);
    });
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  tbody.innerHTML = "";
  inventory.forEach(item => {
    const statusClass = item.qty <= item.min ? "status-low" : "status-ok";
    const statusText = item.qty <= item.min ? "Bajo" : "OK";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.min}</td>
      <td>$${item.cost.toFixed(2)}</td>
      <td class="${statusClass}">${statusText}</td>
      <td>
        <button class="small" data-action="edit" data-id="${item.id}">Editar</button>
        <button class="small" data-action="delete" data-id="${item.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAppointmentsTable(dateFilter) {
  const tbody = document.getElementById("appointments-table-body");
  tbody.innerHTML = "";
  let filtered = appointments;
  if (dateFilter) {
    filtered = appointments.filter(a => a.date === dateFilter);
  }
  filtered.forEach(app => {
    const client = clients.find(c => c.id === app.clientId);
    const service = services.find(s => s.id === app.serviceId);
    const total = service ? service.price : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDateMMDDYYYY(app.date)}</td>

      <td>${formatTimeTo12Hour(app.time)}</td>
      <td>${client ? client.name : "—"}</td>
      <td>${service ? service.name : "—"}</td>
      <td>${app.barber}</td>
      <td>${app.status}</td>
      <td>$${total.toFixed(2)}</td>
      <td>
        <button class="small" data-action="edit" data-id="${app.id}">Editar</button>
        <button class="small" data-action="delete" data-id="${app.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDashboard() {
  const today = new Date().toLocaleDateString("en-CA");

  const todayAppointments = appointments.filter(a => a.date === today);
  const summaryAppointments = document.getElementById("summary-today-appointments");
  const summaryIncome = document.getElementById("summary-today-income");
  const summaryClients = document.getElementById("summary-clients-count");

  summaryAppointments.textContent = `Citas hoy: ${todayAppointments.length}`;

  const totalIncome = todayAppointments.reduce((sum, app) => {
    const service = services.find(s => s.id === app.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);
  summaryIncome.textContent = `Ingresos estimados: $${totalIncome.toFixed(2)}`;
  summaryClients.textContent = `Clientes registrados: ${clients.length}`;

  const tbody = document.getElementById("dashboard-today-appointments-body");
  tbody.innerHTML = "";
  todayAppointments.forEach(app => {
    const client = clients.find(c => c.id === app.clientId);
    const service = services.find(s => s.id === app.serviceId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTimeTo12Hour(app.time)}</td>
      <td>${client ? client.name : "—"}</td>
      <td>${service ? service.name : "—"}</td>
      <td>${app.barber}</td>
      <td>${app.status}</td>
    `;
    tbody.appendChild(tr);
  });

  const alertsList = document.getElementById("dashboard-alerts-list");
  alertsList.innerHTML = "";
  inventory
    .filter(item => item.qty <= item.min)
    .forEach(item => {
      const li = document.createElement("li");
      li.textContent = `Inventario bajo: ${item.name} (stock ${item.qty}, mínimo ${item.min})`;
      alertsList.appendChild(li);
    });

  const topServicesList = document.getElementById("dashboard-top-services-list");
  topServicesList.innerHTML = "";
  const counts = {};
  appointments.forEach(app => {
    const service = services.find(s => s.id === app.serviceId);
    if (!service) return;
    counts[service.name] = (counts[service.name] || 0) + 1;
  });
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([name, count]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${count} citas`;
      topServicesList.appendChild(li);
    });

  // ⭐ AQUI VA
  renderDashboardIncome();  
}


function renderDashboardIncome() {
  const div = document.getElementById("dashboard-income-today");
  const r = calculateTodayIncome();

  div.innerHTML = `
    Total del día: <strong>$${r.totalGeneral.toFixed(2)}</strong><br>
    Citas completadas: ${r.citasCount} ($${r.citasTotal.toFixed(2)})<br>
    Walk-ins: ${r.walkinCount} ($${r.walkinTotal.toFixed(2)})
  `;
}


function formatTimeTo12Hour(time24) {
  let [hour, minute] = time24.split(":");
  hour = parseInt(hour, 10);

  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${ampm}`;
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${mm}-${dd}-${yyyy}`;
}



function refreshQuickAlerts() {
  const quickAlerts = document.getElementById("dashboard-quick-alerts");
  quickAlerts.innerHTML = "";

  getCancelledAppointmentsToday().forEach(a => {
    const client = clients.find(c => c.id === a.clientId);
    const li = document.createElement("li");
    li.textContent = `Cita cancelada: ${formatTimeTo12Hour(a.time)} - Cliente ${client ? client.name : "Desconocido"}`;
    quickAlerts.appendChild(li);
  });

  getLateAppointments().forEach(a => {
    const client = clients.find(c => c.id === a.clientId);
    const li = document.createElement("li");
    li.textContent = `Cita retrasada: ${formatTimeTo12Hour(a.time)} - Cliente ${client.name} (${formatDateMMDDYYYY(a.date)})`;

    quickAlerts.appendChild(li);
  });

}

function refreshNewClientsToday() {
  const newClientsList = document.getElementById("dashboard-new-clients-list");
  newClientsList.innerHTML = "";

  const today = new Date().toLocaleDateString("en-CA");

  clients
    .filter(c => c.createdDate === today)
    .forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.name} (${c.phone})`;
      newClientsList.appendChild(li);
    });
}
