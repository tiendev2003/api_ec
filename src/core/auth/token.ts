import jwt from 'jsonwebtoken';
import { AppError } from '../errors';

export function createToken(payload: any, key: string, exp: string): string {
  // const keyEncoded = Buffer.from(key, 'base64').toString('utf-8');

  const tien= jwt.sign(payload, key, { expiresIn: exp });
 
  return tien
}

export function verifyToken(token: string, key: string): any {
  try {
    // const keyEncoded = Buffer.from(key, 'base64').toString('utf-8');
    return jwt.verify(token, key, {
      ignoreExpiration: false,
      algorithms: ['RS256'],
    });
  } catch (err) {
    throw AppError.invalid('Token is not valid.');
  }
}
