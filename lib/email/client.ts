import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../logger';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!config.RESEND_API_KEY) return null;
  resend ??= new Resend(config.RESEND_API_KEY);
  return resend;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const client = getResendClient();
  if (!client) {
    logger.warn('Email skipped because RESEND_API_KEY is not configured', { subject: payload.subject });
    return;
  }

  try {
    const { error } = await client.emails.send({
      from: config.RESEND_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      logger.error('Email send failed', { to: payload.to, subject: payload.subject, error: error.message });
      return;
    }

    logger.info('Email sent', { to: payload.to, subject: payload.subject });
  } catch (err) {
    logger.error('Email exception', {
      to: payload.to,
      subject: payload.subject,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
