// Firebase SDKs desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Tu configuración
const firebaseConfig = {
  apiKey: "AIzaSyBcWtL3B5aNVpEV0ahXSaP3pK00lEbb6rM",
  authDomain: "restauranteapp-ad17d.firebaseapp.com",
  databaseURL: "https://restauranteapp-ad17d-default-rtdb.firebaseio.com",
  projectId: "restauranteapp-ad17d",
  storageBucket: "restauranteapp-ad17d.firebasestorage.app",
  messagingSenderId: "132764157748",
  appId: "1:132764157748:web:5bd87f5caeca177381c761"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);




