import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyBtVojIVV9uKaxVgISl07557yRGCLKBP5U",
  authDomain: "editnest-6d68e.firebaseapp.com",
  projectId: "editnest-6d68e",
  storageBucket: "editnest-6d68e.firebasestorage.app",
  messagingSenderId: "276474642646",
  appId: "1:276474642646:web:eb0e934b5048cfbb81c977",
  measurementId: "G-2QRH5W5HJN"
};

const readEnv = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY", defaultFirebaseConfig.apiKey),
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN", defaultFirebaseConfig.authDomain),
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID", defaultFirebaseConfig.projectId),
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET", defaultFirebaseConfig.storageBucket),
  messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", defaultFirebaseConfig.messagingSenderId),
  appId: readEnv("VITE_FIREBASE_APP_ID", defaultFirebaseConfig.appId),
  measurementId: readEnv("VITE_FIREBASE_MEASUREMENT_ID", defaultFirebaseConfig.measurementId)
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

appleProvider.addScope("email");
appleProvider.addScope("name");

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInWithApple = async () => {
  const result = await signInWithPopup(auth, appleProvider);
  return result.user;
};

export const logOut = async () => {
  await signOut(auth);
};
