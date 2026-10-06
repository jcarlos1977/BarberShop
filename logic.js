// Protección global para evitar errores si main.js aún no cargó datos
if (typeof appointments === "undefined") {
  window.appointments = [];
}


function generateIncomeReport(fromDate, toDate) {
  // 🔥 Asegurar que appointments existe
  if (!Array.isArray(appointments)) return {
    citasCount: 0,
    citasTotal: 0,
    walkinCount: 0,
    walkinTotal: 0,
    totalGeneral: 0
  };

  // 🔥 Asegurar que walkinCuts existe
  if (!Array.isArray(walkinCuts)) return {
    citasCount: 0,
    citasTotal: 0,
    walkinCount: 0,
    walkinTotal: 0,
    totalGeneral: 0
  };

  // 🔥 Asegurar que services existe
  if (!Array.isArray(services)) return {
    citasCount: 0,
    citasTotal: 0,
    walkinCount: 0,
    walkinTotal: 0,
    totalGeneral: 0
  };

  // ============================
  // CITAS COMPLETADAS
  // ============================
  let completedAppointments = appointments.filter(a => a.status === "completada");

  // ============================
  // WALK-INS EN RANGO
  // ============================
  let walkinsInRange = walkinCuts.filter(c => {
    return (!fromDate || c.date >= fromDate) &&
           (!toDate || c.date <= toDate);
  });

  // ============================
  // TOTAL DE CITAS
  // ============================
  const citasTotal = completedAppointments.reduce((sum, a) => {
    const service = services.find(s => s.id == a.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);

  // ============================
  // TOTAL DE WALK-INS
  // ============================
  const walkinTotal = walkinsInRange.reduce((sum, w) => sum + w.price, 0);

  // ============================
  // RETORNO FINAL
  // ============================
  return {
    citasCount: completedAppointments.length,
    citasTotal,
    walkinCount: walkinsInRange.length,
    walkinTotal,
    totalGeneral: citasTotal + walkinTotal
  };
}

function getTopServices() {
  if (!Array.isArray(appointments) || !Array.isArray(services)) return [];
  const counts = {};
  appointments.forEach(app => {
    const service = services.find(s => s.id == app.serviceId);
    if (!service) return;
    counts[service.name] = (counts[service.name] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function getTopClients() {
  if (!Array.isArray(appointments) || !Array.isArray(clients)) return [];
  const counts = {};
  appointments.forEach(app => {
    const client = clients.find(c => c.id === app.clientId);
    if (!client) return;
    counts[client.name] = (counts[client.name] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderReports() {
  const topServicesList = document.getElementById("report-top-services-list");
  topServicesList.innerHTML = "";
  getTopServices()
    .slice(0, 10)
    .forEach(([name, count]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${count} citas`;
      topServicesList.appendChild(li);
    });

  const topClientsList = document.getElementById("report-top-clients-list");
  topClientsList.innerHTML = "";
  getTopClients()
    .slice(0, 10)
    .forEach(([name, count]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${count} citas`;
      topClientsList.appendChild(li);
    });
}

// CLIENTES NUEVOS
function getNewClientsToday() {
  if (!Array.isArray(clients)) return [];
  const today = new Date().toLocaleDateString("en-CA");
  return clients.filter(c => c.createdDate === today);
}

// CANCELADAS HOY
function getCancelledAppointmentsToday() {
  if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
    return [];
  }

  const today = new Date().toLocaleDateString("en-CA");

  return appointments.filter(a =>
    a.date === today && a.status === "cancelada"
  );
}


// RETRASADAS
function getLateAppointments() {
  // 🔥 Si todavía no hay citas cargadas, regresar lista vacía
  if (!Array.isArray(appointments)) return [];

  const now = new Date();

  return appointments.filter(a => {
    const appDate = new Date(`${a.date}T${a.time}`);
    return appDate < now && a.status === "programada";
  });
}

// 🔥 CAMBIO IMPORTANTE: ahora usa Firestore, no localStorage
async function addWalkinCut({ id, clientId, serviceId, barber, time, price, notes }) {
  const newCut = {
    id: id || generateId("cut"),
    clientId,
    serviceId,
    barber,
    time,
    price,
    notes,
    date: new Date().toLocaleDateString("en-CA")
  };

  await saveWalkinCutToFirestore(newCut);        // 🔥 CAMBIO IMPORTANTE
  walkinCuts = await getWalkinCutsFromFirestore(); // 🔥 CAMBIO IMPORTANTE
}

async function renderCutsToday() {
  const tbody = document.getElementById("cuts-today-table");
  tbody.innerHTML = "";

  if (!Array.isArray(walkinCuts) || !Array.isArray(appointments)) return;

  const today = new Date().toLocaleDateString("en-CA");

  const walkins = walkinCuts.filter(c => c.date === today);
  const citas = appointments.filter(a => a.date === today && a.status === "completada");

  const combined = [
    ...walkins.map(w => ({ ...w, type: "walkin" })),
    ...citas.map(a => ({ ...a, type: "cita" }))
  ];

  combined.sort((a, b) => a.time.localeCompare(b.time));

  combined.forEach(item => {
    const client = clients.find(c => c.id === item.clientId);
    const service = services.find(s => s.id == item.serviceId);
    const price = service ? service.price : (item.price || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTimeTo12Hour(item.time)}</td>
      <td>${client ? client.name : "Walk-in"}</td>
      <td>${service ? service.name : "—"}</td>
      <td>${item.barber}</td>
      <td>$${price.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function renderCutsHistory(dateFilter = null, nameFilter = "") {
  const tbody = document.getElementById("cuts-history-table");
  tbody.innerHTML = "";

  if (!Array.isArray(walkinCuts) || !Array.isArray(appointments)) return;

  let walkins = walkinCuts;
  if (dateFilter) walkins = walkinCuts.filter(c => c.date === dateFilter);

  let citas = appointments.filter(a => a.status === "completada");
  if (dateFilter) citas = citas.filter(a => a.date === dateFilter);

  let combined = [
    ...walkins.map(w => ({ ...w, type: "walkin" })),
    ...citas.map(a => ({ ...a, type: "cita" }))
  ];

  if (nameFilter.trim() !== "") {
    combined = combined.filter(item => {
      const client = clients.find(c => c.id === item.clientId);
      const name = client ? client.name : "Walk-in";
      return name.toLowerCase().includes(nameFilter.toLowerCase());
    });
  }

  combined.sort((a, b) => a.time.localeCompare(b.time));

  combined.forEach(item => {
    const client = clients.find(c => c.id === item.clientId);
    const service = services.find(s => s.id == item.serviceId);
    const price = service ? service.price : (item.price || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDateMMDDYYYY(item.date)}</td>
      <td>${formatTimeTo12Hour(item.time)}</td>
      <td>${client ? client.name : "Walk-in"}</td>
      <td>${service ? service.name : "—"}</td>
      <td>${item.barber}</td>
      <td>$${price.toFixed(2)}</td>
      <td>
        <button class="small delete-cut-btn" data-id="${item.id}" data-type="${item.type}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("cuts-search").addEventListener("input", (e) => {
  const date = document.getElementById("cuts-filter-date").value;
  renderCutsHistory(date, e.target.value);
});

// 🔥 CAMBIO IMPORTANTE: ahora elimina en Firestore y recarga
async function deleteCut(id) {
  await deleteWalkinCutFromFirestore(id);          // 🔥 CAMBIO IMPORTANTE
  walkinCuts = await getWalkinCutsFromFirestore(); // 🔥 CAMBIO IMPORTANTE
  const date = document.getElementById("cuts-filter-date").value || null;
  const search = document.getElementById("cuts-search").value || "";
  await renderCutsHistory(date, search);
}

// 🔥 CAMBIO IMPORTANTE: ahora limpia en Firestore y recarga
async function clearCutsHistory() {
  await clearWalkinCutsFirestore();                // 🔥 CAMBIO IMPORTANTE
  walkinCuts = await getWalkinCutsFromFirestore(); // 🔥 CAMBIO IMPORTANTE
  await renderCutsHistory();
}

function calculateTodayIncome() {
  if (!Array.isArray(appointments) || !Array.isArray(walkinCuts) || !Array.isArray(services)) {
    return {
      citasCount: 0,
      citasTotal: 0,
      walkinCount: 0,
      walkinTotal: 0,
      totalGeneral: 0
    };
  }

  const today = new Date().toLocaleDateString("en-CA");

  const completedAppointments = appointments.filter(a =>
    a.date === today && a.status === "completada"
  );

  const walkinsToday = walkinCuts.filter(w => w.date === today);

  const citasTotal = completedAppointments.reduce((sum, a) => {
    const service = services.find(s => s.id == a.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);

  const walkinTotal = walkinsToday.reduce((sum, w) => sum + w.price, 0);

  return {
    citasCount: completedAppointments.length,
    citasTotal,
    walkinCount: walkinsToday.length,
    walkinTotal,
    totalGeneral: citasTotal + walkinTotal
  };
}

// Puedes dejar este stub o usarlo para pruebas internas
window.cargarCitasFirestore = async function() {
  console.log("cargarCitasFirestore ejecutada (aún sin contenido)");
};
