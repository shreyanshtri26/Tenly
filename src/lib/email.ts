import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

// Transactional email through Gmail SMTP (free, no domain or card needed).
// Create an App Password at https://myaccount.google.com/apppasswords
// (requires 2-Step Verification). Without credentials, emails are printed to
// the server console instead of sent, so local development needs no setup.

const transport =
  env.GMAIL_USER && env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      })
    : nodemailer.createTransport({ jsonTransport: true });

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const info = await transport.sendMail({
    from: env.GMAIL_USER ? `Tenly <${env.GMAIL_USER}>` : "Tenly <dev@localhost>",
    ...message,
  });
  if (!env.GMAIL_USER) {
    console.info("[email:dev] not sent, printing instead:\n", info.message.toString());
  }
}

export function inviteEmail(params: { orgName: string; inviterName: string; acceptUrl: string }) {
  return {
    subject: `${params.inviterName} invited you to ${params.orgName} on Tenly`,
    text: [
      `${params.inviterName} invited you to join ${params.orgName} on Tenly.`,
      "",
      `Accept the invite: ${params.acceptUrl}`,
      "",
      "This link expires in 7 days. If you were not expecting it, ignore this email.",
    ].join("\n"),
  };
}
