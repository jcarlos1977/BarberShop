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

window.getAppointments = getAppointmentsFromFirestore;


// ===============================
// 🔥 Guardar o actualizar cita
// ===============================
async function saveAppointmentToFirestore(app) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = db
    .collection("users")
    .doc(user.uid)
    .collection("appointments");

  if (!app.id) {
    // Crear nueva cita
    const newDoc = await ref.add(app);
    app.id = newDoc.id;
    await ref.doc(app.id).update({ id: app.id });
  } else {
    // Actualizar cita existente
    await ref.doc(app.id).set(app);
  }
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
