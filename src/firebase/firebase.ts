import admin from "firebase-admin";
import fs from "fs";
import {env} from "../config/environment.js";

const serviceAccount = JSON.parse(
    fs.readFileSync(env.FIREBASE_CONFIG_PATH, "utf8")
  );

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log("🔥 Firebase admin initialized");


export default admin;