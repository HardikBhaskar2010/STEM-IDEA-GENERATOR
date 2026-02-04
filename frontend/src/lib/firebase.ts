// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIV6TBBUlOffZ-WTQENatPFEYKdWiJNYU",
  authDomain: "atl-idea-gen.firebaseapp.com",
  projectId: "atl-idea-gen",
  storageBucket: "atl-idea-gen.firebasestorage.app",
  messagingSenderId: "424865615511",
  appId: "1:424865615511:web:228c31c20e05020633a3d2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to emulators in development (optional)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Uncomment these lines if you want to use Firebase emulators in development
  // try {
  //   connectFirestoreEmulator(db, 'localhost', 8080);
  //   connectAuthEmulator(auth, 'http://localhost:9099');
  // } catch (error) {
  //   console.log('Emulators already connected or not available');
  // }
}

export default app;