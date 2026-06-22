import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAtVEUIgZ4ur5L9-7s5-9gAjabW5xFMc44",
  authDomain: "blip-7506d.firebaseapp.com",
  projectId: "blip-7506d",
  storageBucket: "blip-7506d.firebasestorage.app",
  messagingSenderId: "118941285865",
  appId: "1:118941285865:web:bf6fbe999880f3123e1f78",
  measurementId: "G-M96SXGZ2NX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
