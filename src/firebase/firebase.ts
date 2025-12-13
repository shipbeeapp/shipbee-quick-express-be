import admin from "firebase-admin";
import {env} from "../config/environment.js";

admin.initializeApp({
    projectId: env.GCP_PROJECT_ID,
});

console.log("🔥 Firebase admin initialized");


export default admin;