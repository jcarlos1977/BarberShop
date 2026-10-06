// Obtener UID del usuario actual
function getUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// ============================
// OBTENER CLIENTES
// ============================
async function getClientsFromFirestore() {
  const uid = getUserId();
  if (!uid) return [];

  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("clientes")
    .orderBy("createdDate", "desc")
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ============================
// CREAR / ACTUALIZAR CLIENTE
// ============================
async function saveClientToFirestore(client) {
  const uid = getUserId();
  if (!uid) return;

  // 🔥 CAMBIO IMPORTANTE
  client.userId = uid;

  const ref = db.collection("users").doc(uid).collection("clientes");

  // Cliente nuevo
  if (!client.id) {
    const docRef = await ref.add(client);
    client.id = docRef.id;
    await ref.doc(client.id).set(client, { merge: true });
    return;
  }

  // Cliente existente
  await ref.doc(client.id).set(client, { merge: true });
}

// ============================
// ELIMINAR CLIENTE
// ============================
async function deleteClientFromFirestore(id) {
  const uid = getUserId();
  if (!uid) return;

  await db
    .collection("users")
    .doc(uid)
    .collection("clientes")
    .doc(id)
    .delete();
}
