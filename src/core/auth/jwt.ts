import Config from '@/config';
import UserModel from '@/database/model/user';
import bcrypt from 'bcrypt';
import { AppError, ErrorType } from '../errors';
import { AsyncSafeResult, SafeResult } from '../types';
import { createToken, verifyToken } from './token';

interface UserRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  email: string;
  fullName: string;
  id: string;
  phoneNumber?: string;
  accessToken: string;
  refreshToken: string;
}

export class JWTAuthService {
  static async register(userData: UserRegistrationData): AsyncSafeResult<AuthResponse> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      let user = await new UserModel({
        email: userData.email,
        password: hashedPassword,
        phoneNumber: userData.phone,
        fullName: userData.fullName,
        provider: 'LOCAL',
      }).save();
       
      const accessToken = createToken(
        { id: user._id },
        Config.ACCESS_TOKEN_PRIVATE_KEY,
        Config.ACCESS_TOKEN_EXP,
      );
      console.log('tien');
      const refreshToken = createToken(
        { id: user._id },
        Config.REFRESH_TOKEN_PRIVATE_KEY,
        Config.REFRESH_TOKEN_EXP,
      );

      const result = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        accessToken,
        refreshToken,
      };

      return { result, error: null };
    } catch (err) {
      if (err.code === 11000) {
        err = new AppError(ErrorType.Duplicate, 'User Already Exists');
        // err = new DuplicateError('User');
      }
      return { error: err, result: null };
    }
  }

  static async login(userData: UserLogin): AsyncSafeResult<AuthResponse> {
    try {
      const { email, password } = userData;
      const user = await UserModel.findOne({ email }).select('+password').exec();
      if (!user) {
        throw AppError.invalidCredentials();
      }

      const validPass = await bcrypt.compare(password, user.password);
      if (!validPass) {
        throw AppError.invalidCredentials();
      }

      const accessToken = createToken(
        { id: user._id },
        Config.ACCESS_TOKEN_PRIVATE_KEY,
        Config.ACCESS_TOKEN_EXP,
      );

      const refreshToken = createToken(
        { id: user._id },
        Config.REFRESH_TOKEN_PRIVATE_KEY,
        Config.REFRESH_TOKEN_EXP,
      );

      const result: AuthResponse = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        accessToken,
        refreshToken,
      };

      return { result, error: null };
    } catch (err) {
      return { error: err, result: null };
    }
  }

  static verifyAccessToken(token: string): SafeResult<string> {
    try {
      console.log(verifyToken(token, Config.ACCESS_TOKEN_PUBLIC_KEY).id)
      return {
        result: verifyToken(token, Config.ACCESS_TOKEN_PUBLIC_KEY).id as string,
        error: null,
      };
    } catch (err) {
      return { error: err, result: null };
    }
  }

  static async refreshToken(token: string): AsyncSafeResult<string> {
    try {
      const payload = verifyToken(token, Config.REFRESH_TOKEN_PUBLIC_KEY);
      const user = await UserModel.findById(payload.id);

      if (!user) {
        throw AppError.unauthorized();
      }

      const newAccessToken = createToken(
        { id: user._id },
        Config.ACCESS_TOKEN_PRIVATE_KEY,
        Config.ACCESS_TOKEN_EXP,
      );

      return { error: null, result: newAccessToken };
    } catch (err) {
      return { error: err, result: null };
    }
  }
}
