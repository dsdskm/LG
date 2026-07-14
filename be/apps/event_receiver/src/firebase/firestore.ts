// Firestore 실시간 트리거: 일단 전체 비활성화(주석 처리). 프론트는 폴링으로 대체 중.
// 다시 켜려면 아래 블록 주석을 해제하고, receiver.service.ts 의 import/호출도 복원.

// import { initializeApp, getApps } from "firebase/app";
// import { getFirestore, doc, setDoc } from "firebase/firestore";
//
// function getRequiredEnv(name: string): string {
//   const value = process.env[name]?.trim();
//   if (!value) {
//     throw new Error(`Missing required env: ${name}`);
//   }
//   return value;
// }
//
// function getFirebaseConfig() {
//   return {
//     apiKey: getRequiredEnv("FIREBASE_API_KEY"),
//     authDomain: getRequiredEnv("FIREBASE_AUTH_DOMAIN"),
//     projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
//     storageBucket: getRequiredEnv("FIREBASE_STORAGE_BUCKET"),
//     messagingSenderId: getRequiredEnv("FIREBASE_MESSAGING_SENDER_ID"),
//     appId: getRequiredEnv("FIREBASE_APP_ID"),
//   };
// }
//
// function getFirestoreDb() {
//   const app = getApps().length ? getApps()[0] : initializeApp(getFirebaseConfig());
//   const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || "main";
//   return getFirestore(app, databaseId);
// }
//
// export async function updateFirestoreTriggerTime(): Promise<void> {
//   const db = getFirestoreDb();
//   const triggerRef = doc(db, "update", "trigger");
//   await setDoc(triggerRef, { time: Date.now() }, { merge: true });
// }

export {};
