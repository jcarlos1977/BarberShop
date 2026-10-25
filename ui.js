// =====================================================
// ui.js — Todo lo que dibuja en pantalla
// =====================================================

// ============================
// AVISOS (TOASTS) Y MODALES
// ============================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function setBusy(button, busy, text = "Guardando...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    button.disabled = false;
  }
}

// ============================
// NAVEGACIÓN
// ============================
function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === "tab-" + tabId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================
// PIEZAS REUTILIZABLES
// ============================
function emptyRow(tbody, columns, text) {
  tbody.innerHTML = `<tr><td colspan="${columns}" class="empty">${esc(text)}</td></tr>`;
}

function renderList(ul, itemsHtml, emptyText) {
  ul.innerHTML = itemsHtml.length
    ? itemsHtml.join("")
    : `<li class="list-empty">${esc(emptyText)}</li>`;
}

const STATUS_LABELS = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada"
};

function statusBadge(status) {
  return `<span class="badge badge-${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
}

function typeBadge(type) {
  return type === "cita"
    ? `<span class="badge badge-cita">Cita</span>`
    : `<span class="badge badge-walkin">Walk-in</span>`;
}

function inputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

// ============================
// CLIENTES
// ============================
function renderClientsTable() {
  const tbody = document.getElementById("clients-table-body");
  const filter = inputValue("client-search").toLowerCase().trim();

  const list = clients.filter(c =>
    String(c.name || "").toLowerCase().includes(filter) ||
    String(c.phone || "").includes(filter)
  );

  if (!list.length) {
    emptyRow(tbody, 4, clients.length ? "Sin resultados." : "Todavía no hay clientes registrados.");
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <strong>${esc(c.name)}</strong>
        ${c.vip ? '<span class="badge badge-vip">VIP</span>' : ""}
      </td>
      <td>${esc(c.phone)}</td>
      <td class="notes-cell" title="${esc(c.notes || "")}">${esc(c.notes || "")}</td>
      <td><div class="cell-buttons">
        <button class="btn btn-light btn-sm" data-action="photos" data-id="${esc(c.id)}">📷 Fotos</button>
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(c.id)}">Editar</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(c.id)}">Eliminar</button>
      </div></td>
    </tr>
  `).join("");
}

// Llena el select de clientes de citas y del corte rápido
function renderClientsSelect() {
  fillSelect("appointment-client", clients, c => c.name, "Selecciona cliente");
  fillSelect("walkin-client", clients, c => c.name, "Walk-in (sin registro)");
}

function fillSelect(selectId, list, labelFn, placeholder) {
  const select = document.getElementById(selectId);
  const current = select.value;

  select.innerHTML = placeholder ? `<option value="">${esc(placeholder)}</option>` : "";
  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = labelFn(item);
    select.appendChild(opt);
  });

  if (current && list.some(item => String(item.id) === current)) {
    select.value = current;
  }
}

// ============================
// SERVICIOS
// ============================
function renderServicesTable() {
  const tbody = document.getElementById("services-table-body");
  const filter = inputValue("service-search").toLowerCase().trim();

  const list = services.filter(s => String(s.name || "").toLowerCase().includes(filter));

  // Muestra cuántos servicios hay en total
  document.getElementById("services-count").textContent = `(${services.length})`;

  if (!list.length) {
    emptyRow(tbody, 5, services.length ? "Sin resultados." : "Todavía no hay servicios.");
    return;
  }

  tbody.innerHTML = list.map(s => `
    <tr class="${s.active ? "" : "row-muted"}">
      <td><strong>${esc(s.name)}</strong></td>
      <td>${esc(toNumber(s.duration))} min</td>
      <td>${formatMoney(s.price)}</td>
      <td>${s.active
        ? '<span class="badge badge-completada">Activo</span>'
        : '<span class="badge badge-cancelada">Inactivo</span>'}</td>
      <td><div class="cell-buttons">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(s.id)}">Editar</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(s.id)}">Eliminar</button>
      </div></td>
    </tr>
  `).join("");
}

// Llena el select de servicios de citas y del corte rápido (solo activos)
function renderServicesSelect() {
  const active = services.filter(s => s.active);
  const label = s => `${s.name} (${formatMoney(s.price)})`;
  fillSelect("appointment-service", active, label, "Selecciona servicio");
  fillSelect("walkin-service", active, label, "Selecciona servicio");
}

// Si se edita una cita con un servicio inactivo, lo agrega al select
function ensureServiceOption(selectId, serviceId) {
  const select = document.getElementById(selectId);
  if (!serviceId) return;
  const exists = Array.from(select.options).some(o => o.value === String(serviceId));
  if (exists) return;

  const service = findService(serviceId);
  const opt = document.createElement("option");
  opt.value = serviceId;
  opt.textContent = service ? `${service.name} (inactivo)` : "Servicio eliminado";
  select.appendChild(opt);
}

// ============================
// INVENTARIO
// ============================
function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  const filter = inputValue("inventory-search").toLowerCase().trim();

  const list = inventory.filter(i => String(i.name || "").toLowerCase().includes(filter));

  if (!list.length) {
    emptyRow(tbody, 6, inventory.length ? "Sin resultados." : "Todavía no hay productos.");
    return;
  }

  tbody.innerHTML = list.map(item => {
    const low = toNumber(item.qty) <= toNumber(item.min);
    return `
      <tr>
        <td><strong>${esc(item.name)}</strong></td>
        <td>${esc(toNumber(item.qty))}</td>
        <td>${esc(toNumber(item.min))}</td>
        <td>${formatMoney(item.cost)}</td>
        <td>${low
          ? '<span class="badge badge-cancelada">Bajo</span>'
          : '<span class="badge badge-completada">OK</span>'}</td>
        <td><div class="cell-buttons">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(item.id)}">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(item.id)}">Eliminar</button>
        </div></td>
      </tr>
    `;
  }).join("");
}

// ============================
// CITAS
// ============================
function renderAppointmentsTable() {
  const tbody = document.getElementById("appointments-table-body");

  const dateFilter = inputValue("appointments-filter-date");
  const nameFilter = inputValue("appointment-search").toLowerCase().trim();
  const show = {
    programada: document.getElementById("filter-status-programada").checked,
    completada: document.getElementById("filter-status-completada").checked,
    cancelada: document.getElementById("filter-status-cancelada").checked
  };

  let list = appointments.filter(a => show[a.status] !== false);

  if (dateFilter) list = list.filter(a => a.date === dateFilter);

  if (nameFilter) {
    list = list.filter(a => clientName(a.clientId, "").toLowerCase().includes(nameFilter));
  }

  list.sort(byDateTimeDesc);

  if (!list.length) {
    emptyRow(tbody, 8, appointments.length ? "No hay citas con estos filtros." : "Todavía no hay citas.");
    return;
  }

  const now = new Date();

  tbody.innerHTML = list.map(a => {
    let rowClass = "";
    if (a.status === "completada") rowClass = "row-completed";
    else if (a.status === "cancelada") rowClass = "row-cancelled";
    else if (appointmentDateTime(a) < now) rowClass = "row-late";

    return `
      <tr class="${rowClass}">
        <td>${esc(formatDateMMDDYYYY(a.date))}</td>
        <td>${esc(formatTimeTo12Hour(a.time))}</td>
        <td>${esc(clientName(a.clientId))}</td>
        <td>${esc(serviceName(a.serviceId))}</td>
        <td>${esc(a.barber || "")}</td>
        <td>${statusBadge(a.status)}</td>
        <td>${formatMoney(getItemPrice(a))}</td>
        <td><div class="cell-buttons">
          ${a.status === "programada"
            ? `<button class="btn btn-success btn-sm" data-action="complete" data-id="${esc(a.id)}">✓ Completar</button>`
            : ""}
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${esc(a.id)}">Editar</button>
          <button class="btn btn-light btn-sm" data-action="whatsapp" data-id="${esc(a.id)}">WhatsApp</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(a.id)}">Eliminar</button>
        </div></td>
      </tr>
    `;
  }).join("");
}

function slotsHtml(slots) {
  if (slots === null) {
    return `<div class="slot slot-none">Configura tu horario de trabajo en Configuración para ver los huecos disponibles.</div>`;
  }
  if (!slots.length) {
    return `<div class="slot slot-none">Día lleno — no queda tiempo disponible.</div>`;
  }

  return slots.map(s => {
    const from = minutesToHHMM(s.start);
    const label = `${formatTimeTo12Hour(from)} – ${formatTimeTo12Hour(minutesToHHMM(s.end))} · ${s.minutes} min`;

    if (s.minutes < 20) {
      return `<div class="slot slot-none">${esc(label)} · sin cupo</div>`;
    }
    const cls = s.minutes < 30 ? "slot-tight" : "slot-ok";
    const note = s.minutes < 30 ? " · ajustado" : "";
    return `<button type="button" class="slot ${cls}" data-time="${from}">${esc(label)}${note}</button>`;
  }).join("");
}

function renderSlots(dateStr, excludeId = null) {
  const div = document.getElementById("appointment-slots");
  if (!dateStr) {
    div.innerHTML = "";
    return;
  }
  div.innerHTML = `<div class="slots-title">Huecos disponibles (toca uno para usar esa hora)</div>` +
    slotsHtml(getFreeSlots(dateStr, excludeId));
}

// ============================
// CORTES
// ============================
function getCutRecords() {
  return [
    ...walkinCuts.map(w => ({ ...w, type: "walkin" })),
    ...appointments.filter(a => a.status === "completada").map(a => ({ ...a, type: "cita" }))
  ];
}

function renderCutsToday() {
  const tbody = document.getElementById("cuts-today-table");
  const today = todayStr();

  const list = getCutRecords().filter(r => r.date === today).sort(byTime);

  if (!list.length) {
    emptyRow(tbody, 6, "Todavía no hay cortes hoy.");
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${esc(formatTimeTo12Hour(r.time))}</td>
      <td>${typeBadge(r.type)}</td>
      <td>${esc(clientName(r.clientId, "Walk-in"))}</td>
      <td>${esc(serviceName(r.serviceId))}</td>
      <td>${esc(r.barber || "")}</td>
      <td>${formatMoney(getItemPrice(r))}</td>
    </tr>
  `).join("");
}

function renderCutsHistory() {
  const tbody = document.getElementById("cuts-history-table");
  const dateFilter = inputValue("cuts-filter-date");
  const nameFilter = inputValue("cuts-search").toLowerCase().trim();

  let list = getCutRecords();
  if (dateFilter) list = list.filter(r => r.date === dateFilter);
  if (nameFilter) {
    list = list.filter(r => clientName(r.clientId, "Walk-in").toLowerCase().includes(nameFilter));
  }
  list.sort(byDateTimeDesc);

  if (!list.length) {
    emptyRow(tbody, 8, "No hay cortes con estos filtros.");
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${esc(formatDateMMDDYYYY(r.date))}</td>
      <td>${esc(formatTimeTo12Hour(r.time))}</td>
      <td>${typeBadge(r.type)}</td>
      <td>${esc(clientName(r.clientId, "Walk-in"))}</td>
      <td>${esc(serviceName(r.serviceId))}</td>
      <td>${esc(r.barber || "")}</td>
      <td>${formatMoney(getItemPrice(r))}</td>
      <td><div class="cell-buttons">
        <button class="btn btn-danger btn-sm" data-action="delete-cut" data-id="${esc(r.id)}" data-type="${r.type}">Eliminar</button>
      </div></td>
    </tr>
  `).join("");
}

// ============================
// DASHBOARD
// ============================
function renderHeaderStats() {
  const today = todayStr();
  const todayCount = appointments.filter(a => a.date === today && a.status !== "cancelada").length;

  document.getElementById("summary-today-appointments").textContent = todayCount;
  document.getElementById("summary-today-income").textContent = formatMoney(calculateEstimatedIncomeToday());
  document.getElementById("summary-clients-count").textContent = clients.length;
}

function renderDashboardIncome() {
  const r = calculateTodayIncome();
  document.getElementById("dashboard-income-today").innerHTML = `
    <div class="income-total">${formatMoney(r.totalGeneral)}</div>
    <div class="income-row"><span>Citas completadas (${r.citasCount})</span><span>${formatMoney(r.citasTotal)}</span></div>
    <div class="income-row"><span>Cortes rápidos (${r.walkinCount})</span><span>${formatMoney(r.walkinTotal)}</span></div>
  `;
}

function renderTodayAppointments() {
  const tbody = document.getElementById("dashboard-today-appointments-body");
  const today = todayStr();
  const list = appointments.filter(a => a.date === today).sort(byTime);

  if (!list.length) {
    emptyRow(tbody, 5, "No hay citas para hoy.");
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td>${esc(formatTimeTo12Hour(a.time))}</td>
      <td>${esc(clientName(a.clientId))}</td>
      <td>${esc(serviceName(a.serviceId))}</td>
      <td>${esc(a.barber || "")}</td>
      <td>${statusBadge(a.status)}</td>
    </tr>
  `).join("");
}

function renderLowInventory() {
  const items = inventory
    .filter(i => toNumber(i.qty) <= toNumber(i.min))
    .map(i => `<li class="alert-item alert-warning">
      <span><strong>${esc(i.name)}</strong> — stock ${esc(toNumber(i.qty))} (mínimo ${esc(toNumber(i.min))})</span>
    </li>`);
  renderList(document.getElementById("dashboard-alerts-list"), items, "Todo el inventario está bien.");
}

function renderTopServicesDashboard() {
  const items = getTopServices(30).slice(0, 5)
    .map(([name, count]) => `<li><span>${esc(name)}</span><span class="list-count">${count}</span></li>`);
  renderList(document.getElementById("dashboard-top-services-list"), items, "Sin datos todavía.");
}

function renderQuickAlerts() {
  const now = new Date();
  const items = [];

  getUpcomingAppointments(60).forEach(a => {
    const mins = Math.max(1, Math.round((appointmentDateTime(a) - now) / 60000));
    items.push(`<li class="alert-item alert-info">
      <span>⏰ En ${mins} min: <strong>${esc(clientName(a.clientId, "Cliente"))}</strong> (${esc(formatTimeTo12Hour(a.time))})</span>
      <button class="btn btn-success btn-sm" data-action="whatsapp" data-id="${esc(a.id)}">WhatsApp</button>
    </li>`);
  });

  getLateAppointmentsToday().forEach(a => {
    items.push(`<li class="alert-item alert-danger">
      <span>Retrasada: <strong>${esc(clientName(a.clientId, "Cliente"))}</strong> (${esc(formatTimeTo12Hour(a.time))})</span>
    </li>`);
  });

  getCancelledAppointmentsToday().forEach(a => {
    items.push(`<li class="alert-item alert-muted">
      <span>Cancelada: ${esc(clientName(a.clientId, "Cliente"))} (${esc(formatTimeTo12Hour(a.time))})</span>
    </li>`);
  });

  const pastOpen = getPastOpenAppointments().length;
  if (pastOpen > 0) {
    items.push(`<li class="alert-item alert-warning">
      <span>${pastOpen} cita(s) de días anteriores siguen como "Programada". Márcalas como completadas o canceladas en Citas.</span>
    </li>`);
  }

  renderList(document.getElementById("dashboard-quick-alerts"), items, "Sin alertas por ahora.");
}

function renderNewClientsToday() {
  const items = getNewClientsToday()
    .map(c => `<li><span>${esc(c.name)}</span><span class="list-muted">${esc(c.phone)}</span></li>`);
  renderList(document.getElementById("dashboard-new-clients-list"), items, "Sin clientes nuevos hoy.");
}

function renderDashboard() {
  renderHeaderStats();
  renderDashboardIncome();
  renderTodayAppointments();
  renderLowInventory();
  renderTopServicesDashboard();
  renderQuickAlerts();
  renderNewClientsToday();
}

// ============================
// REPORTES
// ============================
function renderReports() {
  const topServices = getTopServices().slice(0, 10)
    .map(([name, count]) => `<li><span>${esc(name)}</span><span class="list-count">${count}</span></li>`);
  renderList(document.getElementById("report-top-services-list"), topServices, "Sin datos todavía.");

  const topClients = getTopClients().slice(0, 10)
    .map(([name, count]) => `<li><span>${esc(name)}</span><span class="list-count">${count} visitas</span></li>`);
  renderList(document.getElementById("report-top-clients-list"), topClients, "Sin datos todavía.");
}

function renderIncomeReport(fromDate, toDate) {
  const r = generateIncomeReport(fromDate, toDate);
  document.getElementById("report-income-summary").innerHTML = `
    <div class="income-row"><span>Citas completadas (${r.citasCount})</span><span>${formatMoney(r.citasTotal)}</span></div>
    <div class="income-row"><span>Cortes rápidos (${r.walkinCount})</span><span>${formatMoney(r.walkinTotal)}</span></div>
    <div class="income-row income-row-total"><span>Total general</span><span>${formatMoney(r.totalGeneral)}</span></div>
  `;
}

// ============================
// FOTOS DE SERVICIOS
// ============================
const SERVICE_PHOTOS = [
  { name: "Foto 1", url: "Man1.png" },
  { name: "Foto 2", url: "Man2.png" },
  { name: "Foto 3", url: "Man3.png" },
  { name: "Foto 4", url: "Woman1.png" }
];

function renderServicePhotos() {
  const container = document.getElementById("service-photos-container");
  container.innerHTML = SERVICE_PHOTOS.map((photo, index) => `
    <figure class="photo-card" data-index="${index}">
      <img src="${esc(photo.url)}" alt="${esc(photo.name)}" class="photo-thumb" loading="lazy" />
      <figcaption>${esc(photo.name)}</figcaption>
    </figure>
  `).join("");
}

// ============================
// CALENDARIO
// ============================
const calendarState = { year: new Date().getFullYear(), month: new Date().getMonth() };

function renderCalendar() {
  const { year, month } = calendarState;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  const title = firstDay.toLocaleString("es-MX", { month: "long", year: "numeric" });
  document.getElementById("calendar-title").textContent = title.charAt(0).toUpperCase() + title.slice(1);

  const counts = {};
  appointments
    .filter(a => a.status !== "cancelada")
    .forEach(a => { counts[a.date] = (counts[a.date] || 0) + 1; });

  let html = "";
  for (let i = 0; i < firstDay.getDay(); i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = counts[dateStr] || 0;

    const classes = ["calendar-day"];
    if (count > 0) classes.push("calendar-day-has-appointments");
    if (dateStr === today) classes.push("calendar-day-today");

    html += `
      <button type="button" class="${classes.join(" ")}" data-date="${dateStr}">
        <strong>${day}</strong>
        ${count > 0 ? `<small>${count} cita${count === 1 ? "" : "s"}</small>` : ""}
      </button>
    `;
  }

  document.getElementById("calendar-grid").innerHTML = html;
}

function openDayDetails(dateStr) {
  hideModal("calendar-modal");
  showModal("day-details-modal");

  document.getElementById("day-title").textContent = `Citas del ${formatDateMMDDYYYY(dateStr)}`;

  const list = appointments.filter(a => a.date === dateStr).sort(byTime);
  const container = document.getElementById("day-appointments");

  container.innerHTML = list.length
    ? list.map(a => `
        <div class="day-appointment">
          <strong>${esc(formatTimeTo12Hour(a.time))}</strong>
          <span>${esc(clientName(a.clientId, "Cliente desconocido"))}</span>
          <span>${esc(serviceName(a.serviceId))}</span>
          ${statusBadge(a.status)}
        </div>
      `).join("")
    : `<p class="list-empty">No hay citas este día.</p>`;

  document.getElementById("day-availability").innerHTML = slotsHtml(getFreeSlots(dateStr))
    .replace(/<button type="button"/g, '<div').replace(/<\/button>/g, "</div>");
}

// ============================
// MODALES DEL CALENDARIO ARRASTRABLES
// ============================
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

  function getPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function clamp(content, left, top) {
    const maxLeft = Math.max(0, window.innerWidth - content.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - content.offsetHeight);
    return {
      left: Math.max(0, Math.min(left, maxLeft)),
      top: Math.max(0, Math.min(top, maxTop))
    };
  }

  function startDrag(e) {
    if (e.target.closest("button")) return;
    if (window.innerWidth <= 768) return; // en celular no se arrastra

    const pos = getPos(e);
    const rect = mainContent.getBoundingClientRect();
    offsetX = pos.x - rect.left;
    offsetY = pos.y - rect.top;
    isDragging = true;
    if (e.cancelable) e.preventDefault();
  }

  function duringDrag(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();

    const pos = getPos(e);
    const main = clamp(mainContent, pos.x - offsetX, pos.y - offsetY);
    mainContent.style.left = `${main.left}px`;
    mainContent.style.top = `${main.top}px`;

    if (!detailModal.classList.contains("hidden")) {
      const detail = clamp(detailContent, main.left + 40, main.top + 40);
      detailContent.style.left = `${detail.left}px`;
      detailContent.style.top = `${detail.top}px`;
    }
  }

  function stopDrag() {
    isDragging = false;
  }

  header.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", duringDrag);
  document.addEventListener("mouseup", stopDrag);

  header.addEventListener("touchstart", startDrag, { passive: false });
  document.addEventListener("touchmove", duringDrag, { passive: false });
  document.addEventListener("touchend", stopDrag);
  document.addEventListener("touchcancel", stopDrag);
}

window.addEventListener("resize", () => {
  if (window.innerWidth <= 768) return;
  document.querySelectorAll(".calendar-modal-content").forEach(content => {
    const maxLeft = Math.max(0, window.innerWidth - content.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - content.offsetHeight);
    const left = Math.max(0, Math.min(parseInt(content.style.left, 10) || 0, maxLeft));
    const top = Math.max(0, Math.min(parseInt(content.style.top, 10) || 0, maxTop));
    if (content.style.left) content.style.left = `${left}px`;
    if (content.style.top) content.style.top = `${top}px`;
  });
});

// ============================
// REFRESCAR TODO
// ============================
function refreshAll() {
  renderClientsTable();
  renderClientsSelect();
  renderServicesTable();
  renderServicesSelect();
  renderInventoryTable();
  renderAppointmentsTable();
  renderCutsToday();
  renderCutsHistory();
  renderDashboard();
  renderReports();
  renderServicePhotos();
}
