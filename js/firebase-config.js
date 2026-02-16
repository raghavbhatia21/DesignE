// Firebase Configuration for Master Admin
const firebaseConfig = {
    apiKey: "AIzaSyBG33egBBScJqr9a0nReDMCUdPw7lsde_U",
    authDomain: "caferesto-94e83.firebaseapp.com",
    databaseURL: "https://caferesto-94e83-default-rtdb.firebaseio.com",
    projectId: "caferesto-94e83",
    storageBucket: "caferesto-94e83.firebasestorage.app",
    messagingSenderId: "95176752035",
    appId: "1:95176752035:web:1b8856dbb1c15f4d3c3816"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();
