import Config from '@/config';
import express from 'express';

import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import { Server as ServerIo } from 'socket.io';
import initAdminApi from './admin_api';
import initApi from './api';
import { createDocs } from './docs/swagger';
import _404Middleware from './middleware/404';
import { JSONMiddleware } from './middleware/JSON';
import cors from './middleware/cors';
import errorMiddleware from './middleware/error';
import { logger } from './middleware/logger';
import { parseJsonMiddleware } from './middleware/parseJson';
import { securityHeader } from './middleware/securityHeader';
import { staticFileMiddleware } from './middleware/staticFile';
import { stripeWebhook } from './middleware/stripe_webhook';
import { initSocket } from './websocket/sockets';

export function createServer(): express.Express {
  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));

  app.set('view engine', 'ejs');
  app.get('/', (_, res) => {
    // render the index template
    res.render('index');
  });

  const server = http.createServer(app);
  const io = new ServerIo(server, { cors: { origin: '*' } });
  app.set('io', io);

  initSocket(io);
  initMiddleware(app);
  initApi(app);
  initAdminApi(app);
  _404Middleware(app);
  errorMiddleware(app);
  server.listen(Config.PORT, () => {
    const address = server.address() as AddressInfo;
    log.info(`app listen on [${address.address}]:${address.port}`);
  });
  return app;
}

function initMiddleware(app: express.Express) {
  securityHeader(app);
  logger(app);
  stripeWebhook(app);
  cors(app);
  staticFileMiddleware(app);
  parseJsonMiddleware(app);
  JSONMiddleware(app);
  createDocs(app);
}
