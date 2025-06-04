import "reflect-metadata";
import App from "../dist/app.js";
import { OrderController } from "../dist/controllers/order.controller.js";
import { CitiesController } from "../dist/controllers/cities.controller.js";
// import { adminJs, adminRouter } from "../dist/admin.js";

let appInstance: App | null = null;

async function ensureAppInitialized() {
  if (!appInstance) {
    appInstance = new App([
      new OrderController(),
      new CitiesController(),
    ]);

    // Optional: a test route
    appInstance.app.get('/test', (req, res) => {
      res.send("Welcome to the API! 🌟");
    });

    await appInstance.initializeDataSource();
    // console.log("✅ Data Source initialized successfully!");
    // await appInstance.app.use(adminJs.options.rootPath, adminRouter);

  }
}

// 👇 This is what Vercel needs: a handler function
export default async function handler(req, res) {
  await ensureAppInitialized();
  return appInstance!.app(req, res); // Pass request to Express
}
