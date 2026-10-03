function generateIncomeReport(fromDate, toDate) {
  let completedAppointments = appointments.filter(a => a.status === "completada");

  let walkinsInRange = walkinCuts.filter(c => {
    return (!fromDate || c.date >= fromDate) &&
          (!toDate || c.date <= toDate);
  });


  const citasTotal = completedAppointments.reduce((sum, a) => {
    const service = services.find(s => s.id == a.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);

  const walkinTotal = walkinsInRange.reduce((sum, w) => sum + w.price, 0);

  return {
    citasCount: completedAppointments.length,
    citasTotal,
    walkinCount: walkinsInRange.length,
    walkinTotal,
    totalGeneral: citasTotal + walkinTotal
  };
}



function getTopServices() {
  const counts = {};
  appointments.forEach(app => {
    const service = services.find(s => s.id == app.serviceId);
    if (!service) return;
    counts[service.name] = (counts[service.name] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function getTopClients() {
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
  const today = new Date().toLocaleDateString("en-CA");
  return clients.filter(c => c.createdDate === today);
}

// CANCELADAS HOY
function getCancelledAppointmentsToday() {
  const today = new Date().toLocaleDateString("en-CA");
  return appointments.filter(a => a.date === today && a.status === "cancelada");
}

// RETRASADAS
function getLateAppointments() {
  const now = new Date();
  return appointments.filter(a => {
    const appDate = new Date(`${a.date}T${a.time}`);
    return appDate < now && a.status === "programada";
  });
}

// CORTES
let walkinCuts = loadFromStorage("barber_app_walkin_cuts") || [];

function addWalkinCut({ id, clientId, serviceId, barber, time, price, notes }) {
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

  walkinCuts.push(newCut);
  saveToStorage("barber_app_walkin_cuts", walkinCuts);
}

function renderCutsToday() {
  const tbody = document.getElementById("cuts-today-table");
  tbody.innerHTML = "";

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
    const price = service && service.price ? service.price : (item.price || 0);


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


function renderCutsHistory(dateFilter = null) {
  const tbody = document.getElementById("cuts-history-table");
  tbody.innerHTML = "";

  let walkins = walkinCuts;
  if (dateFilter) {
    walkins = walkinCuts.filter(c => c.date === dateFilter);
  }

  let citas = appointments.filter(a => a.status === "completada");
  if (dateFilter) {
    citas = citas.filter(a => a.date === dateFilter);
  }

  const combined = [
    ...walkins.map(w => ({ ...w, type: "walkin" })),
    ...citas.map(a => ({ ...a, type: "cita" }))
  ];

  combined.sort((a, b) => a.time.localeCompare(b.time));

  combined.forEach(item => {
    const client = clients.find(c => c.id === item.clientId);
    const service = services.find(s => s.id == item.serviceId);
    const price = service && service.price ? service.price : (item.price || 0);


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





function deleteCut(id) {
  walkinCuts = walkinCuts.filter(c => c.id !== id);
  saveToStorage("barber_app_walkin_cuts", walkinCuts);
}


function clearCutsHistory() {
  walkinCuts = [];
  saveToStorage("barber_app_walkin_cuts", walkinCuts);
}



function calculateTodayIncome() {
  const today = new Date().toLocaleDateString("en-CA");


  const completedAppointments = appointments.filter(a =>
    a.date === today && a.status === "completada"
  );

  const walkinsToday = walkinCuts.filter(w =>
    w.date === today
  );

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
