
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";


const firebaseConfig = {
  apiKey: "AIzaSyAuXIm_oWRj9goBceRk26vMuZoxz1N_M8g",
  authDomain: "atuttechnology1.firebaseapp.com",
  projectId: "atuttechnology1",
  storageBucket: "atuttechnology1.firebasestorage.app",
  messagingSenderId: "859036037679",
  appId: "1:859036037679:web:e3fc19616af62dcfc9ccda",
  measurementId: "G-271N3YH0RD"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export { firebase }

