import express from 'express';
import path from 'path';
export function parseJsonMiddleware(app: express.Express) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));


}
