import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBtVojIVV9uKaxVgISl07557yRGCLKBP5U",
  authDomain: "editnest-6d68e.firebaseapp.com",
  projectId: "editnest-6d68e",
  storageBucket: "editnest-6d68e.firebasestorage.app",
  messagingSenderId: "276474642646",
  appId: "1:276474642646:web:eb0e934b5048cfbb81c977",
  measurementId: "G-2QRH5W5HJN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logOut = async () => {
  await signOut(auth);
};