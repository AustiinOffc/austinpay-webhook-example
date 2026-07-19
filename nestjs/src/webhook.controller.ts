/**
 * AustinPay Webhook Receiver - NestJS
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 */

import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post('/webhook')
  @HttpCode(200)
  handleWebhook(
    @Headers('x-austinpay-signature') signature: string,
    @Headers('x-austinpay-event') eventHeader: string,
    @Req() req: Request,
  ) {
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    // rawBody diaktifkan lewat { rawBody: true } di NestFactory.create (lihat main.ts)
    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf-8') : '';

    this.logger.log('================ WEBHOOK RECEIVED ================');
    this.logger.log(`Event header: ${eventHeader}`);

    let envelope: any = {};
    try {
      envelope = JSON.parse(rawBody);
    } catch { /* ignore */ }

    if (!webhookSecret) {
      throw new HttpException({ error: 'WEBHOOK_SECRET is missing.' }, 500);
    }

    if (!signature) {
      this.logger.warn('Missing X-AustinPay-Signature header');
      throw new HttpException({ error: 'Unauthorized: Missing signature.' }, 401);
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const compBuf = Buffer.from(computedSignature, 'hex');

    let isValid = false;
    if (sigBuf.length === compBuf.length) {
      isValid = crypto.timingSafeEqual(sigBuf, compBuf);
    }

    if (!isValid) {
      this.logger.warn('Invalid signature - rejecting request');
      throw new HttpException({ error: 'Unauthorized: Invalid signature.' }, 401);
    }

    this.logger.log('Webhook Signature Verified Successfully!');
    const { transactionId, amount, status } = envelope.data || {};
    this.logger.log(
      `Event: ${envelope.event || eventHeader} | transactionId=${transactionId} amount=${amount} status=${status}`,
    );

    // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event
    // (deposit.paid, withdraw.approved, withdraw.rejected)

    return { success: true, message: 'Webhook received and processed' };
  }
}
