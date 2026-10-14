// ui.js

function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === "tab-" + tabId);
  });
}

function renderClientsTable(filterText = "") {
  const tbody = document.getElementById("clients-table-body");
  tbody.innerHTML = "";

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(filterText.toLowerCase())
  );

  filteredClients.forEach(client => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${client.name}</td>
      <td>${client.phone}</td>
      <td>${client.vip ? "Sí" : "No"}</td>
      
      <td class="actions-cell">
        <button class="small edit-client-btn" data-id="${client.id}">Editar</button>
        <button class="small delete-client-btn" data-id="${client.id}">Eliminar</button>
        
      </td>

      <td class="photo-cell">
        <button class="small photo-before-btn" data-id="${client.id}">Antes</button>
      </td>

      <td class="photo-cell">
        <button class="small photo-after-btn" data-id="${client.id}">Después</button>
      </td>

    `;


    tbody.appendChild(tr);
  });
}

document.getElementById("client-search").addEventListener("input", (e) => {
  renderClientsTable(e.target.value);
});

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

function renderServicesTable(filterText = "") {
  const tbody = document.getElementById("services-table-body");
  tbody.innerHTML = "";

  const filtered = services.filter(service =>
    service.name.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach(service => {
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

document.getElementById("service-search").addEventListener("input", (e) => {
  renderServicesTable(e.target.value);
});

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

function renderInventoryTable(filterText = "") {
  const tbody = document.getElementById("inventory-table-body");
  tbody.innerHTML = "";

  const filtered = inventory.filter(item =>
    item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach(item => {
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

document.getElementById("inventory-search").addEventListener("input", (e) => {
  renderInventoryTable(e.target.value);
});


function renderAppointmentsTable(dateFilter = "", nameFilter = "") {
  const tbody = document.getElementById("appointments-table-body");
  tbody.innerHTML = "";

  let filtered = appointments;

  // ============================
  // FILTRO POR FECHA
  // ============================
  if (dateFilter) {
    filtered = filtered.filter(a => a.date === dateFilter);
  }

  // ============================
  // FILTRO POR NOMBRE
  // ============================
  if (nameFilter.trim() !== "") {
    filtered = filtered.filter(app => {
      const client = clients.find(c => c.id === app.clientId);
      return client && client.name.toLowerCase().includes(nameFilter.toLowerCase());
    });
  }

  // ============================
  // FILTRO POR ESTADO
  // ============================
  const showProgramada =
    document.getElementById("filter-status-programada")?.checked ?? true;

  const showCompletada =
    document.getElementById("filter-status-completada")?.checked ?? true;

  const showCancelada =
    document.getElementById("filter-status-cancelada")?.checked ?? true;

  filtered = filtered.filter(app => {
    if (app.status === "programada" && showProgramada) return true;
    if (app.status === "completada" && showCompletada) return true;
    if (app.status === "cancelada" && showCancelada) return true;
    return false;
  });

  // ============================
  // ORDENAR POR FECHA Y HORA
  // MÁS NUEVAS ARRIBA
  // ============================
  filtered.sort((a, b) => {
    const dateA = `${a.date}T${a.time}`;
    const dateB = `${b.date}T${b.time}`;

    return new Date(dateB) - new Date(dateA);
  });

  const now = new Date();

  filtered.forEach(app => {
    const client = clients.find(c => c.id === app.clientId);
    const service = services.find(s => s.id == app.serviceId);

    // ============================
    // PRECIO FINAL
    // ============================
    const finalPrice =
      app.price !== undefined &&
      app.price !== null &&
      !isNaN(app.price)
        ? Number(app.price)
        : (service ? Number(service.price) : 0);

    // ============================
    // ESTADO VISUAL
    // ============================
    const appointmentDateTime = new Date(`${app.date}T${app.time}`);

    const isPast =
      appointmentDateTime < now &&
      app.status === "programada";

    const isCompleted =
      app.status === "completada";

    const isCanceled =
      app.status === "cancelada";

    let rowColor = "";

    if (isCompleted) {
      rowColor = "background-color:#d4f8d4;";
    }
    else if (isCanceled) {
      rowColor = "background-color:#f0f0f0;color:#777;";
    }
    else if (isPast) {
      rowColor = "background-color:#ffd6d6;";
    }

    const tr = document.createElement("tr");
    tr.setAttribute("style", rowColor);

    tr.innerHTML = `
      <td>${formatDateMMDDYYYY(app.date)}</td>
      <td>${formatTimeTo12Hour(app.time)}</td>
      <td>${client ? client.name : "—"}</td>
      <td>${service ? service.name : "—"}</td>
      <td>${app.barber}</td>
      <td>${app.status}</td>
      <td>$${finalPrice.toFixed(2)}</td>
      <td>
        <button class="small" data-action="edit" data-id="${app.id}">
          Editar
        </button>

        <button class="small" data-action="delete" data-id="${app.id}">
          Eliminar
        </button>

        <button class="small whatsapp-btn" data-id="${app.id}">
          WhatsApp
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}



function refreshAppointmentsTable() {
  const dateFilter = document.getElementById("appointments-filter-date").value;
  const nameFilter = document.getElementById("appointment-search").value;
  renderAppointmentsTable(dateFilter, nameFilter);
}


document.getElementById("appointment-search").addEventListener("input", (e) => {
  const date = document.getElementById("appointments-filter-date").value;
  renderAppointmentsTable(date, e.target.value);
});

function renderDashboard() {
  const today = new Date().toLocaleDateString("en-CA");

  const todayAppointments = appointments.filter(a => a.date === today);
  const summaryAppointments = document.getElementById("summary-today-appointments");
  const summaryIncome = document.getElementById("summary-today-income");
  const summaryClients = document.getElementById("summary-clients-count");

  summaryAppointments.textContent = `Citas hoy: ${todayAppointments.length}`;

  // ⭐ INGRESOS REALES (precio personalizado o normal)
  const totalIncome = todayAppointments.reduce((sum, app) => {
    const service = services.find(s => s.id == app.serviceId);

    const finalPrice =
      app.price !== undefined && app.price !== null
        ? app.price
        : (service ? service.price : 0);

    return sum + finalPrice;
  }, 0);

  summaryIncome.textContent = `Ingresos estimados: $${totalIncome.toFixed(2)}`;
  summaryClients.textContent = `Clientes registrados: ${clients.length}`;

  const tbody = document.getElementById("dashboard-today-appointments-body");
  tbody.innerHTML = "";
  todayAppointments.forEach(app => {
    const client = clients.find(c => c.id === app.clientId);
    const service = services.find(s => s.id == app.serviceId);
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
    const service = services.find(s => s.id == app.serviceId);
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
    li.textContent = `Cita retrasada: ${formatTimeTo12Hour(a.time)} - Cliente ${client?.name || "Desconocido"} (${formatDateMMDDYYYY(a.date)})`;
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

function populateAppointmentServicesSelect() {
  const select = document.getElementById("appointment-service");
  select.innerHTML = '<option value="">Selecciona servicio</option>';

  services.forEach(service => {
    const opt = document.createElement("option");
    opt.value = service.id;
    opt.textContent = service.name;
    select.appendChild(opt);
  });
}

function editService(id) {
  const s = services.find(x => x.id == id);
  if (!s) return;

  document.getElementById("service-id").value = s.id;
  document.getElementById("service-name").value = s.name;
  document.getElementById("service-duration").value = s.duration;
  document.getElementById("service-price").value = s.price;
  document.getElementById("service-active").checked = s.active;
}

async function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const calendarTitle = document.getElementById("calendar-title");
  const calendarGrid = document.getElementById("calendar-grid");

  calendarTitle.textContent = `${now.toLocaleString("es-MX", { month: "long" })} ${year}`;
  calendarGrid.innerHTML = "";

  // 🔥 FIX: ahora sí es un arreglo
  const appointments = await getAppointments();

  const grouped = {};
  appointments.forEach(a => {
    const d = a.date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(a);
  });

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = grouped[dateStr]?.length || 0;

    const div = document.createElement("div");
    div.className = "calendar-day";

    // ⭐ Si el día tiene citas, resaltarlo
    if (count > 0) {
      div.classList.add("calendar-day-has-appointments");
    }

    // ⭐ Mostrar solo si hay citas
    let label = `<strong>${day}</strong>`;
    if (count > 0) {
      label += `<br><small>${count} citas</small>`;
    }

    div.innerHTML = label;

    div.addEventListener("click", () => openDayDetails(dateStr));

    calendarGrid.appendChild(div);
  }
}




async function openDayDetails(dateStr) {
  // 🔥 Cerrar el calendario al abrir detalles
  document.getElementById("calendar-modal").style.display = "none";

  const modal = document.getElementById("day-details-modal");
  const title = document.getElementById("day-title");
  const list = document.getElementById("day-appointments");
  const availability = document.getElementById("day-availability");

  // Abrir modal de detalles
  modal.style.display = "block";
  title.textContent = `Citas del ${formatDateMMDDYYYY(dateStr)}`;

  // Obtener citas del día
  const appointments = (await getAppointments()).filter(a => a.date === dateStr);
  const clients = await getClients();

  list.innerHTML = "";

  appointments.forEach(a => {
    const client = clients.find(c => c.id === a.clientId);
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${formatTimeTo12Hour(a.time)}</strong> - 
      ${client?.name || "Cliente desconocido"} - 
      ${a.serviceName || "Servicio"}
    `;
    list.appendChild(div);
  });

  const freeSlots = calculateAvailability(appointments);
  availability.innerHTML = freeSlots.map(s => `<div>${s}</div>`).join("");
}



document.getElementById("close-day-details").addEventListener("click", () => {
  // Cerrar modal de detalles
  document.getElementById("day-details-modal").style.display = "none";

  // Volver a abrir calendario
  document.getElementById("calendar-modal").style.display = "block";

  // Recargar calendario como siempre
  renderCalendar();
});


function calculateAvailability(appointments, serviceDuration = 30) {
  // 🔥 Leer horarios reales desde Firestore
  const [startH, startM] = workStartTime.split(":").map(Number);
  const [endH, endM] = workEndTime.split(":").map(Number);

  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  // Convertir citas a intervalos ocupados
  const busy = appointments.map(a => {
    const service = services.find(s => s.id === a.serviceId);
    const duration = service ? Number(service.duration) : 0;

    const [h, m] = a.time.split(":").map(Number);
    const appStart = h * 60 + m;
    const appEnd = appStart + duration;

    return { start: appStart, end: appEnd };
  });

  busy.sort((a, b) => a.start - b.start);

  const freeSlots = [];
  let cursor = start;

  busy.forEach(b => {
    if (cursor < b.start) {
      const gapStart = cursor;
      const gapEnd = b.start;
      const gapMinutes = gapEnd - gapStart;

      freeSlots.push({
        start: gapStart,
        end: gapEnd,
        minutes: gapMinutes,
        fits: gapMinutes >= serviceDuration,
        adjusted: gapMinutes >= serviceDuration && gapMinutes < serviceDuration + 10
      });
    }
    cursor = Math.max(cursor, b.end);
  });

  if (cursor < end) {
    const gapStart = cursor;
    const gapEnd = end;
    const gapMinutes = gapEnd - gapStart;

    freeSlots.push({
      start: gapStart,
      end: gapEnd,
      minutes: gapMinutes,
      fits: gapMinutes >= serviceDuration,
      adjusted: gapMinutes >= serviceDuration && gapMinutes < serviceDuration + 10
    });
  }

  return freeSlots.map(slot => {
    const sH = String(Math.floor(slot.start / 60)).padStart(2, "0");
    const sM = String(slot.start % 60).padStart(2, "0");
    const eH = String(Math.floor(slot.end / 60)).padStart(2, "0");
    const eM = String(slot.end % 60).padStart(2, "0");

    const label = `${formatTimeTo12Hour(`${sH}:${sM}`)} – ${formatTimeTo12Hour(`${eH}:${eM}`)} (${slot.minutes} min)`;

    if (!slot.fits) {
      return `<div style="color:gray">${label} — No disponible</div>`;
    }

    if (slot.adjusted) {
      return `<div style="color:red">${label} — Disponible (ajustado)</div>`;
    }

    return `<div style="color:green">${label} — Disponible</div>`;
  });
}



function makeCalendarModalsDraggable(mainModalId, detailModalId, headerId) {

  const mainModal = document.getElementById(mainModalId);
  const detailModal = document.getElementById(detailModalId);
  const header = document.getElementById(headerId);

  if (!mainModal || !detailModal || !header) return;

  const mainContent = mainModal.querySelector(".calendar-modal-content");
  const detailContent = detailModal.querySelector(".calendar-modal-content");

  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  header.style.cursor = "move";

  function getClientPosition(e) {
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }

    return {
      x: e.clientX,
      y: e.clientY
    };
  }

  function startDrag(e) {

    if (e.target.classList.contains("calendar-close-btn")) return;

    const pos = getClientPosition(e);
    const rect = mainContent.getBoundingClientRect();

    offsetX = pos.x - rect.left;
    offsetY = pos.y - rect.top;

    isDragging = true;

    // Evita scroll accidental en móviles
    if (e.cancelable) {
      e.preventDefault();
    }
  }

  function duringDrag(e) {

    if (!isDragging) return;

    // Bloquea el scroll durante el drag
    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getClientPosition(e);

    let newLeft = pos.x - offsetX;
    let newTop = pos.y - offsetY;

    // Mantener dentro de la pantalla
    const maxLeft =
      window.innerWidth - mainContent.offsetWidth;

    const maxTop =
      window.innerHeight - mainContent.offsetHeight;

    newLeft = Math.max(
      0,
      Math.min(newLeft, maxLeft)
    );

    newTop = Math.max(
      0,
      Math.min(newTop, maxTop)
    );

    mainContent.style.left = `${newLeft}px`;
    mainContent.style.top = `${newTop}px`;

    // Si el otro modal está abierto lo mueve junto
    if (detailModal.style.display === "block") {

      let detailLeft = newLeft + 40;
      let detailTop = newTop + 40;

      const detailMaxLeft =
        window.innerWidth - detailContent.offsetWidth;

      const detailMaxTop =
        window.innerHeight - detailContent.offsetHeight;

      detailLeft = Math.max(
        0,
        Math.min(detailLeft, detailMaxLeft)
      );

      detailTop = Math.max(
        0,
        Math.min(detailTop, detailMaxTop)
      );

      detailContent.style.left = `${detailLeft}px`;
      detailContent.style.top = `${detailTop}px`;
    }
  }

  function stopDrag() {
    isDragging = false;
  }

  // Desktop
  header.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", duringDrag);
  document.addEventListener("mouseup", stopDrag);

  // Mobile
  header.addEventListener("touchstart", startDrag, {
    passive: false
  });

  document.addEventListener("touchmove", duringDrag, {
    passive: false
  });

  document.addEventListener("touchend", stopDrag);
  document.addEventListener("touchcancel", stopDrag);
}


window.addEventListener("resize", () => {

  document.querySelectorAll(".calendar-modal-content").forEach(modal => {

    const maxLeft = window.innerWidth - modal.offsetWidth;
    const maxTop = window.innerHeight - modal.offsetHeight;

    let left = parseInt(modal.style.left) || 0;
    let top = parseInt(modal.style.top) || 0;

    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));

    modal.style.left = `${left}px`;
    modal.style.top = `${top}px`;
  });

});
