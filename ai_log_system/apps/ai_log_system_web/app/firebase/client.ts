import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKIrn5Ddal7jxN10vYdsneTDHuloQoV_8",
  authDomain: "ailogsystem-493123.firebaseapp.com",
  projectId: "ailogsystem-493123",
  storageBucket: "ailogsystem-493123.firebasestorage.app",
  messagingSenderId: "669089571738",
  appId: "1:669089571738:web:ce3a9af07ccd638d0e1023",
};

let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = initializeApp(firebaseConfig);
}

export const firestore: Firestore = getFirestore(app, "main");
