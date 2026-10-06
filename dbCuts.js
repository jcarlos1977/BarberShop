function getUserId() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// ===============================
// 🔥 Obtener walk-ins desde Firestore
// ===============================
async function getWalkinCutsFromFirestore() {
  const uid = getUserId();
  if (!uid) return [];

  const snapshot = await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("walkinCuts")
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ===============================
// 🔥 Guardar o actualizar walk-in
// ===============================
async function saveWalkinCutToFirestore(cut) {
  const uid = getUserId();
  if (!uid) return;

  // 🔥 CAMBIO IMPORTANTE
  cut.userId = uid;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("walkinCuts");

  if (!cut.id) {
    const docRef = await ref.add(cut);
    cut.id = docRef.id;
    await ref.doc(cut.id).set(cut, { merge: true });
    return;
  }

  await ref.doc(cut.id).set(cut, { merge: true });
}

// ===============================
// 🔥 Eliminar walk-in
// ===============================
async function deleteWalkinCutFromFirestore(id) {
  const uid = getUserId();
  if (!uid) return;

  await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("walkinCuts")
    .doc(id)
    .delete();
}

// ===============================
// 🔥 Borrar historial completo
// ===============================
async function clearWalkinCutsFirestore() {
  const uid = getUserId();
  if (!uid) return;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("walkinCuts");

  const snapshot = await ref.get();
  const batch = firebase.firestore().batch();

  snapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
}
