import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import app from "../app.js";
import User from "../models/User.js";
import { matchesOtp, OTP_TTL_MS } from "../services/authOtpService.js";

dotenv.config();
const dbName = `smartfuel_auth_otp_qa_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const messages = [];
const originalTransport = nodemailer.createTransport;
let failNextEmail = false;
let server;
let connected = false;
let checks = 0;
const expect = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks += 1;
};
const latestCode = (address) => {
  const message = messages.findLast((item) => item.to === address);
  assert.ok(message, `Email must be sent to ${address}`);
  const code = message.text.match(/\b\d{6}\b/)?.[0];
  assert.ok(code, "Email must contain a 6-digit code");
  return code;
};
const differentCode = (code) => code === "000000" ? "999999" : "000000";

try {
  assert.ok(process.env.MONGO_URI && process.env.JWT_SECRET, "QA requires the existing backend environment");
  Object.assign(process.env, {
    EMAIL_USER: "qa@example.test", EMAIL_APP_PASSWORD: "qa-app-password", EMAIL_FROM_NAME: "SmartFuel QA",
  });
  nodemailer.createTransport = (options) => {
    expect(options.service, "gmail", "Gmail transport preset");
    expect(options.auth, { user: "qa@example.test", pass: "qa-app-password" }, "Gmail transport credentials use backend environment");
    return { sendMail: async (message) => {
      if (failNextEmail) { failNextEmail = false; throw new Error("Simulated Gmail delivery failure"); }
      expect(message.from, "SmartFuel QA <qa@example.test>", "configured sender name and Gmail account");
      assert.match(message.html, /SmartFuel/);
      assert.match(message.html, /<table role="presentation"/);
      assert.match(message.html, /max-width:560px/);
      assert.match(message.html, new RegExp(`This code expires in ${OTP_TTL_MS / 60_000} minutes\\.`));
      assert.match(message.text, new RegExp(`This code expires in ${OTP_TTL_MS / 60_000} minutes\\.`));
      const emailedCode = message.text.match(/\b\d{6}\b/)?.[0];
      assert.ok(emailedCode && message.html.includes(emailedCode), "HTML and text use the same code");
      assert.ok(!message.html.includes(process.env.EMAIL_APP_PASSWORD), "HTML must not contain mail credentials");
      if (message.subject === "Verify your SmartFuel email") {
        assert.match(message.html, /Your SmartFuel verification code/);
        assert.match(message.html, /Verify your email/);
        assert.match(message.text, /complete your SmartFuel account setup/);
      } else {
        expect(message.subject, "Reset your SmartFuel password", "reset email subject");
        assert.match(message.html, /Your SmartFuel password reset code/);
        assert.match(message.html, /Reset your password/);
        assert.match(message.text, /request to reset your SmartFuel account password/);
      }
      messages.push(message);
      return { messageId: "qa" };
    } };
  };
  await mongoose.connect(process.env.MONGO_URI, { dbName });
  connected = true;
  assert.equal(mongoose.connection.name, dbName, "QA must use its isolated database");
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, body, token) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  const profile = async (token) => {
    const response = await fetch(`${base}/profile`, { headers: { Authorization: `Bearer ${token}` } });
    return response.status;
  };
  const member = (role) => ({ fullName: `QA ${role}`, email: `qa-${role.toLowerCase()}-${dbName}@example.test`, contactNumber: "03001234567", role, password: "Initial123" });

  const legacy = await User.create({ ...member("Individual"), email: `qa-legacy-${dbName}@example.test`, password: await bcrypt.hash("Legacy123", 10) });
  await User.updateOne({ _id: legacy._id }, { $unset: { emailVerified: 1 } });
  const legacyLogin = await request("/auth/login", { email: legacy.email, password: "Legacy123" });
  expect(legacyLogin.status, 200, "legacy member login remains valid");
  const legacyToken = jwt.sign({ id: legacy._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  expect(await profile(legacyToken), 200, "legacy JWT remains valid");
  const admin = await User.create({ ...member("Admin"), password: await bcrypt.hash("Admin1234", 10) });
  expect((await request("/auth/login", { email: admin.email, password: "Admin1234" })).status, 200, "Admin login remains valid");

  const individual = member("Individual");
  const organization = member("Organizational");
  const temporarilyUnavailable = process.env.EMAIL_APP_PASSWORD;
  process.env.EMAIL_APP_PASSWORD = "";
  const unavailableEmail = `qa-no-email-${dbName}@example.test`;
  expect((await request("/auth/register", { ...individual, email: unavailableEmail })).status, 503, "signup requires Gmail configuration");
  expect(await User.countDocuments({ email: unavailableEmail }), 0, "unconfigured Gmail does not create an account");
  process.env.EMAIL_APP_PASSWORD = temporarilyUnavailable;
  const registeredIndividual = await request("/auth/register", individual);
  expect(registeredIndividual.status, 201, "Individual signup");
  expect(registeredIndividual.data.token, undefined, "signup does not issue a JWT");
  expect(registeredIndividual.data.otp, undefined, "signup does not expose OTP");
  const individualCode = latestCode(individual.email);
  const stored = await User.findOne({ email: individual.email }).select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt");
  expect(stored.emailVerified, false, "new member is unverified");
  expect(stored.emailVerificationOtpHash === individualCode, false, "OTP is not stored in plaintext");
  expect(stored.emailVerificationOtpHash.length, 64, "OTP stored as keyed digest");
  expect(matchesOtp(stored._id, "reset", individualCode, stored.emailVerificationOtpHash), false, "verification OTP cannot be used for reset purpose");
  const initialMailCount = messages.length;
  const wrongUnverifiedLogin = await request("/auth/login", { email: individual.email, password: "Wrong1234" });
  expect(wrongUnverifiedLogin.status, 401, "wrong password on unverified account has normal login response");
  expect(wrongUnverifiedLogin.data.code, undefined, "wrong password does not reveal verification state");
  expect(messages.length, initialMailCount, "wrong password does not send verification email");
  const cooldownLogin = await request("/auth/login", { email: individual.email, password: individual.password });
  expect(cooldownLogin.status, 403, "login before verification denied");
  expect(cooldownLogin.data.code, "EMAIL_NOT_VERIFIED", "unverified login has machine-readable code");
  expect(cooldownLogin.data.verificationCodeSent, false, "login within cooldown reuses existing code");
  assert.ok(cooldownLogin.data.resendAfterSeconds > 0 && cooldownLogin.data.resendAfterSeconds <= 60, "remaining cooldown is returned");
  expect(cooldownLogin.data.token, undefined, "unverified login does not issue JWT");
  expect(messages.length, initialMailCount, "login within cooldown does not send another email");
  expect((await request("/auth/login", { email: individual.email, password: individual.password })).data.verificationCodeSent, false, "repeated login does not bypass cooldown");
  expect(messages.length, initialMailCount, "repeated login does not spam email");
  const forged = jwt.sign({ id: stored._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  expect(await profile(forged), 403, "unverified member cannot access protected API with a JWT");
  expect((await request("/auth/verify-email", { email: individual.email, otp: differentCode(individualCode) })).status, 400, "wrong verification code denied");
  const cooldownResend = await request("/auth/resend-verification", { email: individual.email });
  expect(cooldownResend.status, 429, "verification resend cooldown");
  assert.ok(Number(cooldownResend.headers.get("retry-after")) > 0 && Number(cooldownResend.headers.get("retry-after")) <= 60, "resend provides remaining cooldown");
  expect((await request("/auth/verify-email", { email: individual.email, otp: individualCode })).status, 200, "Individual email verified");
  expect((await request("/auth/verify-email", { email: individual.email, otp: individualCode })).status, 400, "verification code cannot be reused");
  const individualLogin = await request("/auth/login", { email: individual.email, password: individual.password });
  expect(individualLogin.status, 200, "Individual login after verification");
  expect(await profile(individualLogin.data.token), 200, "verified member protected route");
  const emailChange = await fetch(`${base}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${individualLogin.data.token}` },
    body: JSON.stringify({ email: `unverified-${dbName}@example.test` }),
  });
  expect(emailChange.status, 400, "Profile API cannot bypass email verification by changing address");

  const recoveredMember = { ...member("Individual"), email: `qa-recovered-${dbName}@example.test` };
  expect((await request("/auth/register", recoveredMember)).status, 201, "recovery scenario signup");
  const originalRecoveryCode = latestCode(recoveredMember.email);
  await User.updateOne({ email: recoveredMember.email }, { $set: {
    emailVerificationOtpSentAt: new Date(Date.now() - 61_000),
    emailVerificationOtpExpiresAt: new Date(Date.now() - 1_000),
  } });
  const beforeRecoveryMailCount = messages.length;
  const wrongRecoveredLogin = await request("/auth/login", { email: recoveredMember.email, password: "Wrong1234" });
  expect(wrongRecoveredLogin.status, 401, "wrong password cannot trigger a recovery email after cooldown");
  expect(wrongRecoveredLogin.data.code, undefined, "wrong password after cooldown hides verification state");
  expect(messages.length, beforeRecoveryMailCount, "wrong password after cooldown sends no email");
  const recoveredLogin = await request("/auth/login", { email: recoveredMember.email, password: recoveredMember.password });
  expect(recoveredLogin.status, 403, "returning unverified member remains unauthenticated");
  expect(recoveredLogin.data.code, "EMAIL_NOT_VERIFIED", "returning member is directed to verification");
  expect(recoveredLogin.data.verificationCodeSent, true, "login after cooldown sends a fresh code");
  expect(recoveredLogin.data.email, recoveredMember.email, "recovery returns email for verification screen");
  expect(recoveredLogin.data.resendAfterSeconds, 60, "fresh recovery code starts resend countdown");
  expect(recoveredLogin.data.token, undefined, "recovery response has no JWT");
  expect(messages.length, beforeRecoveryMailCount + 1, "fresh verification email sent once");
  const freshRecoveryCode = latestCode(recoveredMember.email);
  expect(freshRecoveryCode === originalRecoveryCode, false, "fresh code differs from original");
  expect((await request("/auth/verify-email", { email: recoveredMember.email, otp: originalRecoveryCode })).status, 400, "old recovery code invalidated");
  expect((await request("/auth/verify-email", { email: recoveredMember.email, otp: freshRecoveryCode })).status, 200, "fresh recovery code verifies account");
  expect((await request("/auth/login", { email: recoveredMember.email, password: recoveredMember.password })).status, 200, "recovered member signs in normally");

  expect((await request("/auth/register", organization)).status, 201, "Organizational signup");
  const firstOrganizationCode = latestCode(organization.email);
  expect((await request("/auth/login", { email: organization.email, password: organization.password })).status, 403, "Organizational login before verification denied");
  await User.updateOne({ email: organization.email }, { $set: { emailVerificationOtpSentAt: new Date(Date.now() - 61_000) } });
  const organizationRecovery = await request("/auth/login", { email: organization.email, password: organization.password });
  expect(organizationRecovery.status, 403, "Organizational recovery remains unauthenticated");
  expect(organizationRecovery.data.verificationCodeSent, true, "Organizational login sends new code after cooldown");
  const secondOrganizationCode = latestCode(organization.email);
  expect(secondOrganizationCode === firstOrganizationCode, false, "Organizational recovery creates a different code");
  expect((await request("/auth/verify-email", { email: organization.email, otp: firstOrganizationCode })).status, 400, "old verification code invalid after recovery");
  expect((await request("/auth/verify-email", { email: organization.email, otp: secondOrganizationCode })).status, 200, "Organizational email verified");
  expect((await request("/auth/login", { email: organization.email, password: organization.password })).status, 200, "Organizational login after verification");
  expect((await request("/auth/forgot-password", { email: organization.email })).status, 200, "Organizational reset request");
  const organizationResetCode = latestCode(organization.email);
  const wrongOrganizationCode = differentCode(organizationResetCode);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await request("/auth/reset-password", { email: organization.email, otp: wrongOrganizationCode, newPassword: "Changed123", confirmPassword: "Changed123" })).status, 400, "wrong reset attempt denied");
  }
  expect((await request("/auth/reset-password", { email: organization.email, otp: organizationResetCode, newPassword: "Changed123", confirmPassword: "Changed123" })).status, 400, "correct code locked after five wrong attempts");

  const expiredMember = { ...member("Individual"), email: `qa-expired-${dbName}@example.test` };
  expect((await request("/auth/register", expiredMember)).status, 201, "expiry test signup");
  const expiredCode = latestCode(expiredMember.email);
  await User.updateOne({ email: expiredMember.email }, { $set: { emailVerificationOtpExpiresAt: new Date(Date.now() - 1000) } });
  expect((await request("/auth/verify-email", { email: expiredMember.email, otp: expiredCode })).status, 400, "expired verification code denied");
  await User.updateOne({ email: expiredMember.email }, { $set: { emailVerificationOtpSentAt: new Date(Date.now() - 61_000) } });
  expect((await request("/auth/resend-verification", { email: expiredMember.email })).status, 200, "expired code can be recovered through resend");
  expect((await request("/auth/verify-email", { email: expiredMember.email, otp: latestCode(expiredMember.email) })).status, 200, "resent code verifies expired-code account");
  const retryMember = { ...member("Individual"), email: `qa-retry-${dbName}@example.test` };
  failNextEmail = true;
  const failedDelivery = await request("/auth/register", retryMember);
  expect(failedDelivery.status, 503, "signup reports mail delivery failure");
  expect(failedDelivery.data.verificationRequired, true, "failed delivery keeps account recoverable");
  expect((await User.findOne({ email: retryMember.email }).select("+emailVerificationOtpHash")).emailVerificationOtpHash, undefined, "undelivered code is removed");
  expect((await request("/auth/resend-verification", { email: retryMember.email })).status, 200, "verification can be resent after mail failure");
  expect((await request("/auth/verify-email", { email: retryMember.email, otp: latestCode(retryMember.email) })).status, 200, "recovered signup verifies");
  const failedLoginMember = { ...member("Individual"), email: `qa-login-mail-failure-${dbName}@example.test` };
  expect((await request("/auth/register", failedLoginMember)).status, 201, "login delivery failure test signup");
  await User.updateOne({ email: failedLoginMember.email }, { $set: { emailVerificationOtpSentAt: new Date(Date.now() - 61_000) } });
  failNextEmail = true;
  const failedLoginDelivery = await request("/auth/login", { email: failedLoginMember.email, password: failedLoginMember.password });
  expect(failedLoginDelivery.status, 503, "login recovery reports email delivery failure safely");
  expect(failedLoginDelivery.data.code, "EMAIL_VERIFICATION_DELIVERY_FAILED", "delivery failure is machine-readable");
  expect(failedLoginDelivery.data.token, undefined, "delivery failure never issues JWT");
  expect((await User.findOne({ email: failedLoginMember.email }).select("+emailVerificationOtpHash")).emailVerificationOtpHash, undefined, "failed recovery email clears undelivered code");
  const retryFailedLogin = await request("/auth/login", { email: failedLoginMember.email, password: failedLoginMember.password });
  expect(retryFailedLogin.data.verificationCodeSent, true, "login can retry after email failure");
  expect((await request("/auth/verify-email", { email: failedLoginMember.email, otp: latestCode(failedLoginMember.email) })).status, 200, "retried login code verifies");
  const lockedMember = { ...member("Individual"), email: `qa-locked-${dbName}@example.test` };
  expect((await request("/auth/register", lockedMember)).status, 201, "verification attempt-limit signup");
  const lockedCode = latestCode(lockedMember.email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await request("/auth/verify-email", { email: lockedMember.email, otp: differentCode(lockedCode) })).status, 400, "wrong verification attempt denied");
  }
  expect((await request("/auth/verify-email", { email: lockedMember.email, otp: lockedCode })).status, 400, "correct verification code locked after five wrong attempts");

  const unknownEmail = `qa-unknown-${dbName}@example.test`;
  const knownForgot = await request("/auth/forgot-password", { email: individual.email });
  const unknownForgot = await request("/auth/forgot-password", { email: unknownEmail });
  expect(knownForgot.status, 200, "known account reset request");
  expect(unknownForgot.status, knownForgot.status, "unknown account has same reset status");
  expect(unknownForgot.data.message, knownForgot.data.message, "unknown account has same reset message");
  expect(knownForgot.data.otp, undefined, "reset request does not expose OTP");
  const firstResetCode = latestCode(individual.email);
  const resetBody = (otp, newPassword = "Changed123") => ({ email: individual.email, otp, newPassword, confirmPassword: newPassword });
  expect((await request("/auth/verify-reset-otp", { email: individual.email, otp: differentCode(firstResetCode) })).status, 400, "wrong reset code rejected during code step");
  expect((await request("/auth/verify-reset-otp", { email: individual.email, otp: firstResetCode })).status, 200, "reset code verified before password form");
  expect((await request("/auth/reset-password", resetBody(differentCode(firstResetCode)))).status, 400, "wrong reset code denied");
  await User.updateOne({ email: individual.email }, { $set: { passwordResetOtpExpiresAt: new Date(Date.now() - 1000) } });
  expect((await request("/auth/reset-password", resetBody(firstResetCode))).status, 400, "expired reset code denied");
  await User.updateOne({ email: individual.email }, { $set: { passwordResetOtpSentAt: new Date(Date.now() - 61_000) } });
  expect((await request("/auth/forgot-password", { email: individual.email })).status, 200, "password reset code resent");
  const secondResetCode = latestCode(individual.email);
  expect((await request("/auth/reset-password", resetBody(firstResetCode))).status, 400, "old reset code invalid after resend");
  expect((await request("/auth/verify-reset-otp", { email: individual.email, otp: secondResetCode })).status, 200, "new reset code verified");
  expect((await request("/auth/reset-password", resetBody(secondResetCode))).status, 200, "password reset succeeds");
  expect((await request("/auth/verify-reset-otp", { email: individual.email, otp: secondResetCode })).status, 400, "used reset code no longer verifies");
  expect((await request("/auth/reset-password", resetBody(secondResetCode))).status, 400, "reset code cannot be reused");
  expect((await request("/auth/login", { email: individual.email, password: individual.password })).status, 401, "old password fails");
  expect((await request("/auth/login", { email: individual.email, password: "Changed123" })).status, 200, "new password works");
  expect(await profile(individualLogin.data.token), 401, "password reset revokes prior JWT");
  expect((await request("/auth/forgot-password", { email: unknownEmail })).status, 200, "public OTP request within rate limit");
  expect((await request("/auth/forgot-password", { email: unknownEmail })).status, 200, "final allowed public OTP request");
  expect((await request("/auth/forgot-password", { email: unknownEmail })).status, 429, "public OTP request rate limit");

  console.log(`Auth OTP isolated API QA passed: ${checks} assertions`);
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (connected) {
    if (mongoose.connection.name !== dbName || !dbName.startsWith("smartfuel_auth_otp_qa_")) {
      throw new Error("QA cleanup refused: database name did not match isolated QA database");
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  nodemailer.createTransport = originalTransport;
}
