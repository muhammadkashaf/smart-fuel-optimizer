import nodemailer from "nodemailer";
import { emailTemplate } from "./emailTemplate.js";

let transport;
let warnedAboutMissingConfiguration = false;

export const emailConfigured = () => {
  const configured = Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_APP_PASSWORD?.trim());
  if (!configured && process.env.NODE_ENV !== "production" && !warnedAboutMissingConfiguration) {
    console.error("Gmail email delivery is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in the backend environment.");
    warnedAboutMissingConfiguration = true;
  }
  return configured;
};

const getTransport = () => {
  if (!emailConfigured()) throw new Error("Gmail email delivery is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in the backend environment.");
  if (!transport) {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transport;
};

export async function sendOtpEmail(to, code, purpose, expiryMinutes) {
  const verification = purpose === "verification";
  const content = verification
    ? {
        title: "Verify your email",
        preheader: "Your SmartFuel verification code",
        message: "Use the verification code below to complete your SmartFuel account setup.",
        securityMessage: "If you didn't create a SmartFuel account, you can safely ignore this email.",
      }
    : {
        title: "Reset your password",
        preheader: "Your SmartFuel password reset code",
        message: "We received a request to reset your SmartFuel account password.",
        securityMessage: "If you didn't request a password reset, you can safely ignore this email.",
      };
  const { html, text } = emailTemplate({ ...content, code, expiryMinutes });
  await getTransport().sendMail({
    from: `${process.env.EMAIL_FROM_NAME || "SmartFuel"} <${process.env.EMAIL_USER}>`,
    to,
    subject: verification ? "Verify your SmartFuel email" : "Reset your SmartFuel password",
    html,
    text,
  });
}
