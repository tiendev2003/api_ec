import { config } from 'dotenv';
import Config from './index';
import { CreateProDir } from './initDir';
config();

type Key = keyof typeof Config;

for (const key in Config) {
  if (Config[key as Key] === undefined || Config[key as Key] === '') {
    throw new Error(`Environment variable '${key}' not found`);
  }
}

CreateProDir();
