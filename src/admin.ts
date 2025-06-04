// src/admin.ts
import AdminJS from 'adminjs';
import * as AdminJSExpress from '@adminjs/express';
import * as AdminJSTypeorm from '@adminjs/typeorm';
import { Order } from './models/order.model.js';

AdminJS.registerAdapter({ Database: AdminJSTypeorm.Database, Resource: AdminJSTypeorm.Resource });

export const adminJs = new AdminJS({
  resources: [Order],
  rootPath: '/admin',
});

export const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    if (email === 'admin@example.com' && password === 'admin123') {
      return { email: 'admin@example.com' };
    }
    return null;
  },
  cookiePassword: 'a-very-secret-cookie-password',
});
