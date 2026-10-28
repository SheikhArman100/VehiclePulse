import { Kafka, logLevel, type KafkaConfig, type Producer, type Consumer, type Admin } from "kafkajs";

export interface KafkaClientOptions {
  clientId: string;
  brokers: string[];
  connectionTimeout?: number;
  requestTimeout?: number;
}

/**
 * Factory for creating a standardized Kafka client instance.
 */
export const createKafkaClient = (options: KafkaClientOptions): Kafka => {
  const config: KafkaConfig = {
    clientId: options.clientId,
    brokers: options.brokers,
    connectionTimeout: options.connectionTimeout ?? 5000,
    requestTimeout: options.requestTimeout ?? 10000,
    logLevel: logLevel.NOTHING, // Handled cleanly via application logger
  };

  return new Kafka(config);
};

export type { Kafka, Producer, Consumer, Admin };
