import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// !! REPLACE these values with your own from the Firebase console !!
// Instructions: https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyCQ1XkLt3o6SSdk4uIuddi4ZyZsuVGnT-w",
  authDomain: "mindful-moment-b63dc.firebaseapp.com",
  projectId: "mindful-moment-b63dc",
  storageBucket: "mindful-moment-b63dc.firebasestorage.app",
  messagingSenderId: "258266109626",
  appId: "1:258266109626:web:cf6e3c93f39955cc051483"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
