import {inject, Provider} from '@loopback/context';
import {ILogger, LOGGER} from '@sourceloop/core';
import {OtpGenerateFn} from './types';
import {HttpErrors} from '@loopback/rest';
import {AuthErrorKeys} from 'loopback4-authentication';
import {totp} from 'otplib';

const otpStep = 120;
const otpWindow = 1;

export class OtpGenerateProvider implements Provider<OtpGenerateFn> {
  constructor(@inject(LOGGER.LOGGER_INJECT) private readonly logger: ILogger) {}
  value(): OtpGenerateFn {
    return async () => {
      if (!process.env.OTP_SECRET) {
        this.logger.error('Invalid OTP secret');
        throw new HttpErrors.Unauthorized(AuthErrorKeys.InvalidCredentials);
      }
      totp.options = {
        step: +process.env.OTP_STEP! || otpStep, //NOSONAR
        window: +process.env.OTP_WINDOW! || otpWindow, //NOSONAR
      };
      return totp.generate(process.env.OTP_SECRET);
    };
  }
}
