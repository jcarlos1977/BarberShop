// models.js

let clients = [];
let services = [];
let inventory = [];
let walkinCuts = [];

let settings = loadSettings();

function generateId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}

// CLIENTES
async function addOrUpdateClient(client) {
  // 🔥 Guardar en Firestore (crear o actualizar)
  await saveClientToFirestore(client);

  // 🔥 Recargar lista desde Firestore
  clients = await getClientsFromFirestore();

  // 🔥 Volver a dibujar todo
  renderClientsTable();
  renderClientsSelect();
  refreshAll();
}




function deleteClient(id) {
  clients = clients.filter(c => c.id !== id);
  saveToStorage(STORAGE_KEYS.clients, clients);
}


// SETTINGS
function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
}
