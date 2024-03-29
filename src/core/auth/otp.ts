import OTPModel, { OTPType } from '@/database/model/OTP';

function generateOTP(): string {
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

export async function createOTP(email: string, type: OTPType): Promise<string> {
  await OTPModel.deleteOne({
    $and: [{ email }, { otpType: type }],
  });
  const otp = generateOTP();
  const otpDoc = await OTPModel.create({
    code: otp,
    otpType: type,
    email: email,
  });
  if (!otpDoc) {
    throw new Error('can not create OTP');
  }
  return otpDoc.code;
}

export async function validateOTP(
  otp: string,
  email: string,
  type: OTPType,
  remove?: boolean,
): Promise<boolean> {
  try {
    const otpDoc = await OTPModel.findOne({
      $and: [{ email }, { otpType: type }, { code: otp }],
    });
    if (!otpDoc) {
      return false;
    }
    if (remove) {
      await OTPModel.findByIdAndDelete(otpDoc._id);
    }
    return true;
  } catch {
    return false;
  }
}
