import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqzu18ymGSI2eHqa9R4EqXDMk3Batz-KM",
  authDomain: "xeia-learns.firebaseapp.com",
  projectId: "xeia-learns",
  storageBucket: "xeia-learns.firebasestorage.app",
  messagingSenderId: "392719858494",
  appId: "1:392719858494:web:013fcfdec48e465ddcca6f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);