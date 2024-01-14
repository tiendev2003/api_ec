import './config/init';
import { initDB } from './database/init';
import './log';
import { createServer } from './server/index';
 

process.on('uncaughtException', (err: Error) => {
  log.error(err);
});

process.on('unhandledRejection', reason => {
  log.error(reason);
});
console.log(123)

async function main() {
  await initDB();
  console.log(12)
  createServer();
 
}
main();
