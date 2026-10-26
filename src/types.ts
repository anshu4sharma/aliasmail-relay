export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

export interface IncomingEmailWebhook {
  id: string;
  alias: string;
  from: EmailSender;
  to: EmailRecipient[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  timestamp: string;
}

export interface RelayConfig {
  port: number;
  webhookSecret?: string;
  forwardUrls: string[];
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}
