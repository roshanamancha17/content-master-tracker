import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8nOZw58smF4l5qUA_NYeYr_rz2oMwfbk",
  authDomain: "content-master-db.firebaseapp.com",
  projectId: "content-master-db",
  storageBucket: "content-master-db.firebasestorage.app",
  messagingSenderId: "155414980344",
  appId: "1:155414980344:web:d6b40c88579ed3ab35fd0d",
  measurementId: "G-QHQ6ZTR5RX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();