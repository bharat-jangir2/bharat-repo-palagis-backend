import { Inject, Injectable, Logger } from '@nestjs/common';
import { Messaging, MulticastMessage } from 'firebase-admin/messaging';
import { FIREBASE_MESSAGING } from '../firebase/firebase.module';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly MAX_TOKENS_PER_BATCH = 500;

  constructor(
    @Inject(FIREBASE_MESSAGING)
    private readonly messaging: Messaging,
  ) {}

  /**
   * Send a push notification to many devices using FCM multicast,
   * processed in parallel batches of up to 500 tokens each.
   */
  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!tokens || tokens.length === 0) {
      this.logger.warn('sendPushNotification called with empty tokens array');
      return { successCount: 0, failureCount: 0, batches: [] };
    }

    // Chunk tokens into batches of MAX_TOKENS_PER_BATCH
    const batches: string[][] = [];
    for (let i = 0; i < tokens.length; i += this.MAX_TOKENS_PER_BATCH) {
      batches.push(tokens.slice(i, i + this.MAX_TOKENS_PER_BATCH));
    }

    this.logger.log(
      `Sending push notification to ${tokens.length} tokens in ${batches.length} batch(es)`,
    );

    const baseMessage: Omit<MulticastMessage, 'tokens'> = {
      notification: { title, body },
      data,
    };

    // Process batches in parallel
    const batchPromises = batches.map(async (batchTokens, index) => {
      const message: MulticastMessage = {
        ...baseMessage,
        tokens: batchTokens,
      };

      try {
        const response = await this.messaging.sendEachForMulticast(message);
        this.logger.log(
          `Batch ${index + 1}/${batches.length}: success=${response.successCount}, failure=${response.failureCount}`,
        );

        return {
          batchIndex: index,
          tokens: batchTokens,
          response,
        };
      } catch (error) {
        this.logger.error(
          `Error sending batch ${index + 1}/${batches.length}`,
          (error as any)?.stack || (error as any),
        );
        return {
          batchIndex: index,
          tokens: batchTokens,
          error,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Aggregate summary
    let successCount = 0;
    let failureCount = 0;

    for (const result of batchResults) {
      if ((result as any).response) {
        successCount += (result as any).response.successCount;
        failureCount += (result as any).response.failureCount;
      } else if ((result as any).error) {
        // If whole batch failed, count all tokens as failures
        failureCount += (result as any).tokens.length;
      }
    }

    this.logger.log(
      `Push notifications summary: success=${successCount}, failure=${failureCount}`,
    );

    return {
      successCount,
      failureCount,
      batches: batchResults,
    };
  }
}

