// models.js

let clients = loadFromStorage(STORAGE_KEYS.clients);
let services = loadFromStorage(STORAGE_KEYS.services);
let appointments = loadFromStorage(STORAGE_KEYS.appointments);
let inventory = loadFromStorage(STORAGE_KEYS.inventory);
let settings = loadSettings();

function generateId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}

// CLIENTES
function addOrUpdateClient(client) {
  if (!client.id) {
    client.id = generateId("cli");
    clients.push(client);
  } else {
    clients = clients.map(c => (c.id === client.id ? client : c));
  }
  saveToStorage(STORAGE_KEYS.clients, clients);
}

function deleteClient(id) {
  clients = clients.filter(c => c.id !== id);
  saveToStorage(STORAGE_KEYS.clients, clients);
}

// SERVICIOS
function addOrUpdateService(service) {
  if (!service.id) {
    service.id = generateId("srv");
    services.push(service);
  } else {
    services = services.map(s => (s.id === service.id ? service : s));
  }
  saveToStorage(STORAGE_KEYS.services, services);
}

function deleteService(id) {
  services = services.filter(s => s.id !== id);
  saveToStorage(STORAGE_KEYS.services, services);
}

// CITAS
function addOrUpdateAppointment(app) {
  if (!app.id) {
    app.id = generateId("apt");
    appointments.push(app);
  } else {
    appointments = appointments.map(a => (a.id === app.id ? app : a));
  }
  saveToStorage(STORAGE_KEYS.appointments, appointments);
}

function deleteAppointment(id) {
  appointments = appointments.filter(a => a.id !== id);
  saveToStorage(STORAGE_KEYS.appointments, appointments);
}

// INVENTARIO
function addOrUpdateInventoryItem(item) {
  if (!item.id) {
    item.id = generateId("inv");
    inventory.push(item);
  } else {
    inventory = inventory.map(i => (i.id === item.id ? item : i));
  }
  saveToStorage(STORAGE_KEYS.inventory, inventory);
}

function deleteInventoryItem(id) {
  inventory = inventory.filter(i => i.id !== id);
  saveToStorage(STORAGE_KEYS.inventory, inventory);
}

// SETTINGS
function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
}
