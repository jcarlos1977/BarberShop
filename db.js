// =====================================================
// db.js — Conexión a Firebase y todo lo que lee/escribe
// en Firestore. Reemplaza a: dbClients.js, dbServices.js,
// dbAppointments.js, dbInventory.js, dbCuts.js, models.js,
// storage.js, firebase.js y auth.js
// =====================================================

// ============================
// CONFIGURACIÓN DE FIREBASE
// (la apiKey de Firebase no es secreta; la seguridad
//  está en las reglas de Firestore)
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyBcWtL3B5aNVpEV0ahXSaP3pK00lEbb6rM",
  authDomain: "restauranteapp-ad17d.firebaseapp.com",
  databaseURL: "https://restauranteapp-ad17d-default-rtdb.firebaseio.com",
  projectId: "restauranteapp-ad17d",
  storageBucket: "restauranteapp-ad17d.firebasestorage.app",
  messagingSenderId: "132764157748",
  appId: "1:132764157748:web:5bd87f5caeca177381c761"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Nombres de las colecciones (se mantienen los que ya tienes
// para no perder datos)
const COL = {
  clients: "clientes",
  services: "services",
  appointments: "appointments",
  inventory: "inventory",
  cuts: "walkinCuts",
  photos: "clientPhotos",
  settings: "settings"
};

// ============================
// ESTADO GLOBAL DE LA APP
// ============================
let clients = [];
let services = [];
let appointments = [];
let inventory = [];
let walkinCuts = [];
let workHours = { startTime: "", endTime: "" };
let currentUsername = "";

function clearAllData() {
  clients = [];
  services = [];
  appointments = [];
  inventory = [];
  walkinCuts = [];
  workHours = { startTime: "", endTime: "" };
  currentUsername = "";
}

// ============================
// HELPERS
// ============================
function getUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

function userCol(name) {
  const uid = getUserId();
  if (!uid) throw new Error("No hay sesión iniciada.");
  return db.collection("users").doc(uid).collection(name);
}

function serverTimestamp() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

// Firestore no acepta "undefined" y el id va en el documento, no adentro
function cleanData(obj) {
  const out = {};
  Object.keys(obj).forEach(key => {
    if (key === "id") return;
    if (obj[key] === undefined) return;
    out[key] = obj[key];
  });
  return out;
}

function byName(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" });
}

async function fetchAll(colName) {
  const snap = await userCol(colName).get();
  // doc.id va al final para que siempre gane sobre cualquier "id" viejo guardado adentro
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

async function saveDoc(colName, item) {
  const data = cleanData(item);
  data.updatedAt = serverTimestamp();

  if (item.id) {
    await userCol(colName).doc(String(item.id)).set(data, { merge: true });
    return String(item.id);
  }

  data.createdAt = serverTimestamp();
  const ref = await userCol(colName).add(data);
  return ref.id;
}

async function deleteDocById(colName, id) {
  await userCol(colName).doc(String(id)).delete();
}

// Borra toda una colección en bloques (Firestore permite máx. 500 por batch)
async function clearCollection(colName) {
  const snap = await userCol(colName).get();
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

// ============================
// CARGAR DATOS
// ============================
async function loadClients() {
  clients = (await fetchAll(COL.clients)).sort(byName);
}

async function loadServices() {
  let list = await fetchAll(COL.services);
  if (list.length === 0) {
    const seeded = await seedDefaultServicesOnce();
    if (seeded) list = await fetchAll(COL.services);
  }
  services = list.sort(byName);
}

async function loadAppointments() {
  appointments = await fetchAll(COL.appointments);
}

async function loadInventory() {
  inventory = (await fetchAll(COL.inventory)).sort(byName);
}

async function loadCuts() {
  walkinCuts = await fetchAll(COL.cuts);
}

async function loadWorkHours() {
  const snap = await userCol(COL.settings).doc("workHours").get();
  const data = snap.exists ? snap.data() : {};
  workHours = {
    startTime: data.startTime || "",
    endTime: data.endTime || ""
  };
}

async function loadAllData() {
  await Promise.all([
    loadClients(),
    loadServices(),
    loadAppointments(),
    loadInventory(),
    loadCuts(),
    loadWorkHours()
  ]);
}

// ============================
// GUARDAR / BORRAR
// ============================
async function saveClient(client) {
  await saveDoc(COL.clients, client);
  await loadClients();
}

async function deleteClient(id) {
  await deleteDocById(COL.clients, id);

  // Borra sus 8 fotos (4 antes + 4 después) y las de la versión anterior
  const deletes = [];
  PHOTO_TYPES.forEach(type => {
    PHOTO_SIDES.forEach(side => {
      deletes.push(userCol(COL.photos).doc(photoDocId(id, type, side.key)).delete());
    });
    deletes.push(userCol(COL.photos).doc(legacyPhotoDocId(id, type)).delete());
  });
  await Promise.all(deletes);

  await loadClients();
}

async function saveService(service) {
  await saveDoc(COL.services, service);
  await loadServices();
}

async function deleteService(id) {
  await deleteDocById(COL.services, id);
  await loadServices();
}

async function saveAppointment(app) {
  await saveDoc(COL.appointments, app);
  await loadAppointments();
}

async function deleteAppointment(id) {
  await deleteDocById(COL.appointments, id);
  await loadAppointments();
}

async function saveInventoryItem(item) {
  await saveDoc(COL.inventory, item);
  await loadInventory();
}

async function deleteInventoryItem(id) {
  await deleteDocById(COL.inventory, id);
  await loadInventory();
}

async function saveWalkinCut(cut) {
  await saveDoc(COL.cuts, cut);
  await loadCuts();
}

async function deleteWalkinCut(id) {
  await deleteDocById(COL.cuts, id);
  await loadCuts();
}

async function clearWalkinCuts() {
  await clearCollection(COL.cuts);
  await loadCuts();
}

async function saveWorkHours(startTime, endTime) {
  await userCol(COL.settings).doc("workHours").set({ startTime, endTime });
  workHours = { startTime, endTime };
}

// ============================
// FOTOS ANTES / DESPUÉS (4 lados cada una)
// Cada foto va en su propio documento:
//   clientPhotos/{clienteId}_{before|after}_{front|back|left|right}
// Así ninguna pasa el límite de 1 MB por documento y la
// lista de clientes sigue cargando rápido.
// ============================
const PHOTO_TYPES = ["before", "after"];

const PHOTO_SIDES = [
  { key: "front", label: "Frente" },
  { key: "back",  label: "Atrás" },
  { key: "left",  label: "Lado izquierdo" },
  { key: "right", label: "Lado derecho" }
];

function photoDocId(clientId, type, side) {
  return `${clientId}_${type}_${side}`;
}

// Formato de la versión anterior (una sola foto por tipo)
function legacyPhotoDocId(clientId, type) {
  return `${clientId}_${type}`;
}

function legacyPhotoField(type) {
  return type === "before" ? "photoBefore" : "photoAfter";
}

// Devuelve { before: { front, back, left, right }, after: { ... } }
// con la imagen de cada lado, o "" si no tiene
async function getClientPhotos(clientId) {
  const result = { before: {}, after: {} };
  const legacy = { before: "", after: "" };
  const reads = [];

  PHOTO_TYPES.forEach(type => {
    PHOTO_SIDES.forEach(side => {
      reads.push(
        userCol(COL.photos).doc(photoDocId(clientId, type, side.key)).get().then(snap => {
          result[type][side.key] = snap.exists ? (snap.data().image || "") : "";
        })
      );
    });

    reads.push(
      userCol(COL.photos).doc(legacyPhotoDocId(clientId, type)).get().then(snap => {
        legacy[type] = snap.exists ? (snap.data().image || "") : "";
      })
    );
  });

  await Promise.all(reads);

  // Las fotos de versiones anteriores se muestran como "Frente"
  const client = clients.find(c => String(c.id) === String(clientId));
  PHOTO_TYPES.forEach(type => {
    if (!result[type].front) {
      result[type].front = legacy[type] || (client && client[legacyPhotoField(type)]) || "";
    }
  });

  return result;
}

async function saveClientPhoto(clientId, type, side, dataUrl) {
  await userCol(COL.photos).doc(photoDocId(clientId, type, side)).set({
    clientId: String(clientId),
    type,
    side,
    image: dataUrl,
    updatedAt: serverTimestamp()
  });
  if (side === "front") await removeLegacyPhoto(clientId, type);
}

async function deleteClientPhoto(clientId, type, side) {
  await userCol(COL.photos).doc(photoDocId(clientId, type, side)).delete();
  if (side === "front") await removeLegacyPhoto(clientId, type);
}

// Quita la foto vieja para que no vuelva a aparecer como "Frente"
async function removeLegacyPhoto(clientId, type) {
  await userCol(COL.photos).doc(legacyPhotoDocId(clientId, type)).delete();

  const field = legacyPhotoField(type);
  const client = clients.find(c => String(c.id) === String(clientId));
  if (client && client[field] !== undefined) {
    await userCol(COL.clients).doc(String(clientId)).update({
      [field]: firebase.firestore.FieldValue.delete()
    });
    await loadClients();
  }
}

// ============================
// LOGIN CON USERNAME
// Se usa la colección "usernames/{username}" → { uid, email }.
// Así ya no hace falta que la colección "users" se pueda leer
// sin iniciar sesión.
// ============================
async function resolveLoginEmail(input) {
  const value = input.trim().toLowerCase();
  if (value.includes("@")) return value;

  const snap = await db.collection("usernames").doc(value).get();
  if (!snap.exists) return null;
  return snap.data().email || null;
}

async function loadProfile(user) {
  const snap = await db.collection("users").doc(user.uid).get();
  const data = snap.exists ? snap.data() : {};
  const username = data.username || (user.email ? user.email.split("@")[0] : "usuario");

  // Crea el registro en "usernames" si todavía no existe,
  // para que la próxima vez pueda entrar con su username
  if (data.username) {
    const key = String(data.username).toLowerCase();
    try {
      const idx = await db.collection("usernames").doc(key).get();
      if (!idx.exists) {
        await db.collection("usernames").doc(key).set({ uid: user.uid, email: user.email });
      }
    } catch (err) {
      console.warn("No se pudo registrar el username para login:", err);
    }
  }

  return username;
}

// ============================
// SERVICIOS POR DEFECTO
// Solo se cargan una vez por usuario
// ============================
const DEFAULT_SERVICES = [
  { name: "Low Fade", duration: 30, price: 30, active: true },
  { name: "Taper Fade", duration: 30, price: 30, active: true },
  { name: "High Fade", duration: 30, price: 30, active: true },
  { name: "Spiky Hair", duration: 30, price: 30, active: true },
  { name: "Pompadour", duration: 45, price: 40, active: true },
  { name: "Faux Hawk", duration: 30, price: 30, active: true },
  { name: "Undercut", duration: 40, price: 35, active: true },
  { name: "Textured Crop", duration: 30, price: 30, active: true },
  { name: "Quiff", duration: 40, price: 35, active: true },
  { name: "Hard Part", duration: 30, price: 30, active: true },
  { name: "Crew Cut", duration: 20, price: 25, active: true },
  { name: "Low Cut", duration: 20, price: 25, active: true },
  { name: "Drop Fade", duration: 30, price: 30, active: true },
  { name: "Burst Fade", duration: 30, price: 30, active: true },
  { name: "Comb Over", duration: 40, price: 35, active: true },
  { name: "Fringe Crop Fade", duration: 30, price: 30, active: true },
  { name: "Curly High Fade", duration: 40, price: 35, active: true },
  { name: "High Top Fade", duration: 40, price: 35, active: true },
  { name: "Box Fade", duration: 40, price: 35, active: true },
  { name: "Mid Skin Fade", duration: 30, price: 30, active: true },
  { name: "Buzz Cut with Fade", duration: 20, price: 25, active: true },
  { name: "Classic Taper Fade", duration: 30, price: 30, active: true },
  { name: "Skin Fade with Short Curls", duration: 40, price: 35, active: true },
  { name: "Shadow Fade", duration: 30, price: 30, active: true },
  { name: "Razor Fade", duration: 40, price: 40, active: true },
  { name: "Temple Fade", duration: 30, price: 30, active: true },
  { name: "Mohawk Fade", duration: 40, price: 40, active: true },
  { name: "Blowout Fade", duration: 35, price: 35, active: true },
  { name: "French Crop", duration: 30, price: 30, active: true },
  { name: "Edgar Cut", duration: 30, price: 30, active: true },
  { name: "Mullet Moderno", duration: 40, price: 40, active: true },
  { name: "Caesar Cut", duration: 25, price: 25, active: true },
  { name: "Line Up + Fade", duration: 30, price: 30, active: true },
  { name: "Fade con Diseño", duration: 45, price: 45, active: true },
  { name: "Afro Shape Up", duration: 40, price: 40, active: true },
  { name: "Waves + Shape Up", duration: 35, price: 35, active: true },
  { name: "Corte de Mujer Largo", duration: 45, price: 45, active: true },
  { name: "Corte de Mujer Medio", duration: 40, price: 40, active: true },
  { name: "Corte de Mujer Corto", duration: 35, price: 35, active: true },
  { name: "Capas Largas", duration: 45, price: 45, active: true },
  { name: "Capas Medias", duration: 40, price: 40, active: true },
  { name: "Fleco / Bangs", duration: 20, price: 20, active: true },
  { name: "Blowout Mujer", duration: 45, price: 45, active: true },
  { name: "Plancha / Straight Hair", duration: 40, price: 40, active: true },
  { name: "Rizos con Tenaza", duration: 45, price: 45, active: true },
  { name: "Peinado Elegante", duration: 60, price: 60, active: true },
  { name: "Peinado Casual", duration: 40, price: 40, active: true },
  { name: "Tinte Completo", duration: 120, price: 120, active: true },
  { name: "Retoque de Raíz", duration: 60, price: 60, active: true },
  { name: "Balayage", duration: 150, price: 150, active: true },
  { name: "Mechas / Highlights", duration: 120, price: 120, active: true },
  { name: "Matiz / Toner", duration: 45, price: 45, active: true },
  { name: "Tratamiento Capilar", duration: 45, price: 45, active: true },
  { name: "Botox Capilar", duration: 90, price: 90, active: true },
  { name: "Keratina", duration: 120, price: 150, active: true },
  { name: "Depilación de Cejas", duration: 15, price: 15, active: true }
];

async function seedDefaultServicesOnce() {
  const flagRef = userCol(COL.settings).doc("app");
  const flag = await flagRef.get();
  if (flag.exists && flag.data().servicesSeeded) return false;

  const batch = db.batch();
  DEFAULT_SERVICES.forEach(service => {
    const ref = userCol(COL.services).doc();
    batch.set(ref, { ...service, createdAt: serverTimestamp() });
  });
  batch.set(flagRef, { servicesSeeded: true }, { merge: true });
  await batch.commit();
  return true;
}

// Agrega solo los servicios predeterminados que todavía no existen
// (compara por nombre). Los que ya tienes no se tocan, así que
// tus precios cambiados se respetan. Devuelve cuántos agregó.
async function addMissingDefaultServices() {
  const existing = new Set(services.map(s => String(s.name || "").trim().toLowerCase()));
  const missing = DEFAULT_SERVICES.filter(s => !existing.has(s.name.toLowerCase()));
  if (!missing.length) return 0;

  const batch = db.batch();
  missing.forEach(service => {
    const ref = userCol(COL.services).doc();
    batch.set(ref, { ...service, createdAt: serverTimestamp() });
  });
  await batch.commit();
  await loadServices();
  return missing.length;
}
