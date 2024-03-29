import {
  JWTAuthService,
  OAuthAuthService,
  OTPVerification,
  createEmailVerificationOTP,
  createForgotPasswordOTP,
  resetPassword,
  verifyUserEmail,
} from '@/core/auth';
import emails from '@/core/emails';
import { User } from '@/core/user';
import { OTPType } from '@/database/model/OTP';
import { Controller } from '@server/decorator/controller';
import { Validate } from '@server/decorator/validate';
import RequestError, { handleResultError, unwrapResult } from '@server/utils/errors';
import { HttpStatus } from '@server/utils/status';
import { Request, RequestHandler, Response } from 'express';
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  changePasswordSchema,
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOTPSchema,
} from './auth.valid';

interface IAuth {
  login: RequestHandler;
  register: RequestHandler;
}

@Controller()
class AuthController implements IAuth {
  @Validate(loginSchema)
  public async login(req: Request, res: Response) {
    const body: LoginSchema = req.body;
    const result = await JWTAuthService.login(body);
    // if (response.error) {
    //   if (response.error instanceof InvalidCredentialsError) {
    //     throw new RequestError(response.error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }

    const response = unwrapResult(result);
    res.JSON(HttpStatus.Ok, response);
  }

  @Validate(registerSchema)
  public async register(req: Request, res: Response) {
    const body: RegisterSchema = req.body;
    const result = await JWTAuthService.register({
      email: body.email,
      fullName: body.fullName,
      password: body.password,
      phone: body.phone,
    });
    // if (result.error) {
    //   if (result.error instanceof DuplicateError) {
    //     throw new RequestError(result.error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    const response = unwrapResult(result);
    res.JSON(HttpStatus.Created, response);
  }

  public async refresh(req: Request, res: Response) {
    const refreshToken = req.get('X-Refresh-Token');
    if (!refreshToken) {
      throw new RequestError('not authorized', HttpStatus.Unauthorized);
    }
    const result = await JWTAuthService.refreshToken(refreshToken);
    // if (newAccessToken.error) {
    //   if (newAccessToken.error instanceof InvalidTokenError) {
    //     throw new RequestError(newAccessToken.error.message, HttpStatus.Unauthorized);
    //   }
    //   throw RequestError._500();
    // }
    const newAccessToken = unwrapResult(result);
    res.JSON(HttpStatus.Created, { accessToken: newAccessToken });
  }

  public google(_: Request, res: Response) {
    const url = OAuthAuthService.loginGooglePageUrl();
    res.redirect(url);
  }

  public async googleRedirect(req: Request, res: Response) {
    if (!req.query.code) {
      throw new RequestError('Only access from google Oauth2', HttpStatus.BadRequest);
    }
    const response = await OAuthAuthService.handleGoogleCode(req.query.code.toString());
    // if (response.error) {
    //   if (response.error instanceof UnauthorizedGoogleError) {
    //     throw new RequestError(response.error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    const result = unwrapResult(response);
    res.JSON(HttpStatus.Created, result);
  }

  @Validate(changePasswordSchema)
  public async changePassword(req: Request, res: Response) {
    const body: ChangePasswordSchema = req.body;
    const user = new User(req.userId!);
    const error = await user.changePassword({
      newPassword: body.password,
      oldPassword: body.oldPassword,
    });
    // if (error) {
    //   if (error instanceof InvalidCredentialsError) {
    //     throw new RequestError(error.message, HttpStatus.Unauthorized);
    //   }
    //   if (error instanceof NotFoundError) {
    //     throw new RequestError(error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    if (error) {
      handleResultError(error);
    }
    res.JSON(HttpStatus.Ok);
  }

  public async sendVerifyEmail(req: Request, res: Response) {
    const otp = await createEmailVerificationOTP(req.userId!);
    // if (otp.error) {
    //   if (otp.error instanceof InvalidDataError) {
    //     throw new RequestError(otp.error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }

    const result = unwrapResult(otp);

    await emails.sendOTPEmail(result.otp, result.user);
    res.JSON(HttpStatus.Ok);
  }

  public async verifyEmail(req: Request, res: Response) {
    const otp = req.params['otp'].toString();
    if (!otp || otp.length !== 6) {
      throw new RequestError(
        'The provided OTP is not valid or has expired.',
        HttpStatus.BadRequest,
      );
    }
    const error = await verifyUserEmail(req.userId!, otp);
    // if (error) {
    //   if (error instanceof InvalidDataError) {
    //     throw new RequestError(error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    if (error) {
      handleResultError(error);
    }
    res.JSON(HttpStatus.Ok);
  }

  @Validate(emailSchema)
  public async forgotPassword(req: Request, res: Response) {
    const otp = await createForgotPasswordOTP(req.body['email']);
    // if (otp.error) {
    //   if (otp.error instanceof InvalidDataError) {
    //     throw new RequestError(otp.error.message, HttpStatus.BadRequest);
    //   }
    //   throw new RequestError(otp.error.message, HttpStatus.BadRequest);
    // }

    const result = unwrapResult(otp);
    await emails.sendOTPPassword(result.otp, result.user);
    res.JSON(HttpStatus.Ok);
  }

  @Validate(resetPasswordSchema)
  public async resetPassword(req: Request, res: Response) {
    const body: ResetPasswordSchema = req.body;
    const error = await resetPassword(body);
    // if (error) {
    //   if (error instanceof NotFoundError || error instanceof InvalidDataError) {
    //     throw new RequestError(error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    if (error) {
      handleResultError(error);
    }
    res.JSON(HttpStatus.Ok);
  }

  @Validate(verifyOTPSchema)
  public async verifyPasswordOTP(req: Request, res: Response) {
    const body: Omit<ResetPasswordSchema, 'newPassword'> = req.body;
    const isVerified = await OTPVerification(body.email, body.otp, OTPType.FORGOT_PASSWORD);
    // if (isVerified.error) {
    //   if (isVerified.error instanceof NotFoundError) {
    //     throw new RequestError(isVerified.error.message, HttpStatus.BadRequest);
    //   }
    //   throw RequestError._500();
    // }
    const result = unwrapResult(isVerified);
    res.JSON(HttpStatus.Ok, { ok: result });
  }
}

export default new AuthController();
