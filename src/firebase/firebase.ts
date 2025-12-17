import admin from "firebase-admin";
import fs from "fs";
import {env} from "../config/environment.js";

let serviceAccount;

if (env.FIREBASE_CONFIG_PATH === '/etc/secrets/firebase-account.json') {
  console.log("🔐 Using Firebase config from mounted secret");
  serviceAccount = JSON.parse(
    fs.readFileSync(env.FIREBASE_CONFIG_PATH, "utf8")
  );
} else {
  console.log("⚠️ Using Firebase config from local environment variable");
  serviceAccount = JSON.parse(
      env.FIREBASE_CONFIG_PATH
  );
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log("🔥 Firebase admin initialized");


export default admin;