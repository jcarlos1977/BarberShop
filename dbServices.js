// ===============================
// FIRESTORE - SERVICIOS
// ===============================

function getUserId() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// 🔥 Obtener servicios desde Firestore
async function getServicesFromFirestore() {
  const uid = getUserId();
  if (!uid) return [];

  const snapshot = await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("services")
    .get();

  const list = [];
  snapshot.forEach(doc => list.push(doc.data()));
  return list;
}

// 🔥 Guardar o actualizar servicio
async function saveServiceToFirestore(service) {
  const uid = getUserId();
  if (!uid) return;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("services");

  // Nuevo servicio
  if (!service.id) {
    const docRef = await ref.add(service);
    service.id = docRef.id;

    await ref.doc(service.id).set(service, { merge: true });
    return;
  }

  // Servicio existente
  await ref.doc(service.id).set(service, { merge: true });
}

// 🔥 Eliminar servicio
async function deleteServiceFromFirestore(id) {
  const uid = getUserId();
  if (!uid) return;

  await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("services")
    .doc(id)
    .delete();
}


async function loadDefaultServicesIntoFirestore() {
  const uid = getUserId();
  if (!uid) return;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("services");

  // Obtener servicios actuales
  const snapshot = await ref.get();

  // Si ya hay servicios, no hacer nada
  if (!snapshot.empty) return;

  // Insertar servicios por defecto
  for (const def of defaultServices) {
    const docRef = await ref.add(def);
    await ref.doc(docRef.id).set({ ...def, id: docRef.id }, { merge: true });
  }
}

async function addOrUpdateService(service) {
  await saveServiceToFirestore(service);
  services = await getServicesFromFirestore();
}
