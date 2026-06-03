/* ── firebase ── the ONLY module that imports from the Firebase CDN.
   All sub-packages must share the same pinned version (12.14.0).
   Offline persistence (IndexedDB cache) is enabled here via
   initializeFirestore + persistentLocalCache. ── */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  collection, doc, onSnapshot, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfACuDIBzkexrapnzlAQ1kJCRYLAQzs3c",
  authDomain: "docket-af114.firebaseapp.com",
  projectId: "docket-af114",
  storageBucket: "docket-af114.firebasestorage.app",
  messagingSenderId: "703998051568",
  appId: "1:703998051568:web:15216840c544ddf2cfae35"
};

const app = initializeApp(firebaseConfig);

/* enable the on-device cache; falls back gracefully if unsupported */
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
} catch (e) {
  console.warn('[firebase] persistent cache unavailable, using default', e);
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
  db = getFirestore(app);
}

export { db, collection, doc, onSnapshot, setDoc, deleteDoc };
