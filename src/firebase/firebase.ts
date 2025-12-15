import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
    fs.readFileSync("dist/firebase/firebase-admin.json", "utf8")
  );

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log("🔥 Firebase admin initialized");


export default admin;