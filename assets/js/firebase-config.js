import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
    apiKey:
        "AIzaSyA5wzsbLfyLVexY5MDgeg24r7n349rIRnQ",

    authDomain:
        "larva-5b230.firebaseapp.com",

    databaseURL:
        "https://larva-5b230-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId:
        "larva-5b230",

    storageBucket:
        "larva-5b230.firebasestorage.app",

    messagingSenderId:
        "935886999076",

    appId:
        "1:935886999076:web:54a72d7ecc83638b4712b1",

    measurementId:
        "G-ZMESYWV2EE"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);