/**
 * EmailProvider adapter. Resend in production, console mock otherwise.
 * Switch by setting RESEND_API_KEY and FEATURE_MOCK_EMAIL=false.
 */
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ ok: boolean; error?: string }>;
}

class ConsoleMockEmailProvider implements EmailProvider {
  readonly name = "console-mock";
  async send(message: EmailMessage) {
    console.log(
      `[mock-email] Til: ${message.to} | Emne: ${message.subject}\n${message.text}`,
    );
    return { ok: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  async send(message: EmailMessage) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.emailFrom,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (env.resendApiKey && !env.features.mockEmail) {
    return new ResendEmailProvider();
  }
  return new ConsoleMockEmailProvider();
}
