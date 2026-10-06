function getUserId() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// ===============================
// 🔥 Obtener inventario desde Firestore
// ===============================
async function getInventoryFromFirestore() {
  const uid = getUserId();
  if (!uid) return [];

  const snapshot = await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("inventory")
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ===============================
// 🔥 Guardar o actualizar producto
// ===============================
async function saveInventoryItemToFirestore(item) {
  const uid = getUserId();
  if (!uid) return;

  // 🔥 CAMBIO IMPORTANTE
  item.userId = uid;

  const ref = firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("inventory");

  // Nuevo producto
  if (!item.id) {
    const docRef = await ref.add(item);
    item.id = docRef.id;
    await ref.doc(item.id).set(item, { merge: true });
    return;
  }

  // Producto existente
  await ref.doc(item.id).set(item, { merge: true });
}

// ===============================
// 🔥 Eliminar producto
// ===============================
async function deleteInventoryItemFromFirestore(id) {
  const uid = getUserId();
  if (!uid) return;

  await firebase.firestore()
    .collection("users")
    .doc(uid)
    .collection("inventory")
    .doc(id)
    .delete();
}

// ===============================
// 🔥 Wrapper
// ===============================
async function addOrUpdateInventoryItem(item) {
  await saveInventoryItemToFirestore(item);
  inventory = await getInventoryFromFirestore();
}
