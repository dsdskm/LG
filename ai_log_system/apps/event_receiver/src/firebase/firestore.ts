import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKIrn5Ddal7jxN10vYdsneTDHuloQoV_8",
  authDomain: "ailogsystem-493123.firebaseapp.com",
  projectId: "ailogsystem-493123",
  storageBucket: "ailogsystem-493123.firebasestorage.app",
  messagingSenderId: "669089571738",
  appId: "1:669089571738:web:ce3a9af07ccd638d0e1023",
};

const FIRESTORE_DATABASE_ID = "main";
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

export async function updateFirestoreTriggerTime(): Promise<void> {
  const triggerRef = doc(db, "update", "trigger");
  await setDoc(triggerRef, { time: Date.now() }, { merge: true });
}
