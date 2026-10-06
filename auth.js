import { auth } from "./firebase.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Registrar usuario
export async function registrar(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

// Login
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Logout
export async function logout() {
  return await signOut(auth);
}


