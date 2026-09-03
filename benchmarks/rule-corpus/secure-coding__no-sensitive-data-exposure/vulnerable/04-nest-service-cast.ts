/**
 * VULNERABLE (TypeScript) - A NestJS service logging a credential through a
 * class-held logger, with the value passed through an `as string` cast. Both
 * the receiver shape (`this.logger`) and the cast wrapper are ordinary
 * TypeScript; neither changes what reaches the log file.
 */
import { Injectable, Logger } from '@nestjs/common';

interface WebhookPayload {
  readonly apiKey: unknown;
  readonly deliveryId: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  public verify(payload: WebhookPayload): boolean {
    this.logger.debug(payload.apiKey as string);
    return typeof payload.apiKey === 'string';
  }
}
