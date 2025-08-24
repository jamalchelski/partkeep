// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// const firebaseConfig = {
//   "projectId": "partkeep-5dq4h",
//   "appId": "1:602447126467:web:a202cd6ff45667a7e76776",
//   "storageBucket": "partkeep-5dq4h.firebasestorage.app",
//   "apiKey": "AIzaSyBWtTeaJ4jqfLxolBHhBloyWQxTNf5hxFY",
//   "authDomain": "partkeep-5dq4h.firebaseapp.com",
//   "measurementId": "",
//   "messagingSenderId": "602447126467"
// };
const firebaseConfig = {
  apiKey: "AIzaSyDi_IKsrH3rWFGAsjixkLsuCYhUs8HyZzE",
  authDomain: "bm-wh-3bc2e.firebaseapp.com",
  projectId: "bm-wh-3bc2e",
  storageBucket: "bm-wh-3bc2e.firebasestorage.app",
  messagingSenderId: "314921046933",
  appId: "1:314921046933:web:e00835ce3bd374a626dc9c",
  measurementId: "G-9E76V0F64V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();