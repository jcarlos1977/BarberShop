// storage.js
const STORAGE_KEYS = {
  clients: "barber_app_clients",
  services: "barber_app_services",
  appointments: "barber_app_appointments",
  inventory: "barber_app_inventory",
  settings: "barber_app_settings"
};

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo localStorage", key, e);
    return [];
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Error guardando en localStorage", key, e);
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo settings", e);
    return {};
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error("Error guardando settings", e);
  }
}
