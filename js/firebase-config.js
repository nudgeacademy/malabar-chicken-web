// Firebase Configuration matching the project info in google-services.json
const firebaseConfig = {
    apiKey: "AIzaSyByPwyaNgWEzFyYohEB6iBW0Bd6npu77Ss",
    authDomain: "malabarchicken-erp-2026.firebaseapp.com",
    projectId: "malabarchicken-erp-2026",
    storageBucket: "malabarchicken-erp-2026.firebasestorage.app",
    messagingSenderId: "575059789357",
    appId: "1:575059789357:web:fb50a57dbf22d2af1e2b5aa4" // Standard web application ID format
};

// Initialize Firebase
let firebaseApp;
let db;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(firebaseApp);
    
    // Enable offline persistence for web (replicates Android offline capabilities)
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn("Firestore persistence failed-precondition: Multiple tabs open.");
            } else if (err.code == 'unimplemented') {
                console.warn("Firestore persistence unimplemented in this browser.");
            }
        });
        
    console.log("Firebase initialized successfully with offline persistence.");
} catch (e) {
    console.error("Firebase initialization error:", e);
}
