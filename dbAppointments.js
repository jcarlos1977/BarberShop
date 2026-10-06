function getUserId() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// ===============================
// 🔥 Obtener citas desde Firestore
// ===============================
async function getAppointmentsFromFirestore() {
  const uid = getUserId();
  if (!uid) return [];

  const snapshot = await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("appointments")
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ===============================
// 🔥 Guardar o actualizar cita
// ===============================
async function saveAppointmentToFirestore(app) {
  const uid = getUserId();
  if (!uid) return;

  // 🔥 CAMBIO IMPORTANTE
  app.userId = uid;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("appointments");

  // Nueva cita
  if (!app.id) {
    const docRef = await ref.add(app);
    app.id = docRef.id;
    await ref.doc(app.id).set(app, { merge: true });
    return;
  }

  // Cita existente
  await ref.doc(app.id).set(app, { merge: true });
}

// ===============================
// 🔥 Eliminar cita
// ===============================
async function deleteAppointmentFromFirestore(id) {
  const uid = getUserId();
  if (!uid) return;

  await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("appointments")
    .doc(id)
    .delete();
}

// ===============================
// 🔥 Wrapper
// ===============================
async function addOrUpdateAppointment(app) {
  await saveAppointmentToFirestore(app);
  appointments = await getAppointmentsFromFirestore();
}
