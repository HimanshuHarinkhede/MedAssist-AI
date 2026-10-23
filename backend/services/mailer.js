/**
 * mailer.js — MedAssist AI Automated Email Service
 * Uses Brevo SMTP (smtp-relay.brevo.com:587) with REST API fallback
 */

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // TLS via STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
  }
  return transporter;
}

function getFromAddress() {
  return process.env.EMAIL_FROM || '"MedAssist AI Clinic" <sandeepbyadav085@gmail.com>';
}

/**
 * Send email using Brevo REST API fallback if SMTP encounters an issue
 */
async function sendViaBrevoRestApi({ to, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("Missing BREVO_API_KEY");

  // Extract raw email address from EMAIL_FROM (e.g. '"Name" <user@domain.com>' -> 'user@domain.com')
  const fromStr = getFromAddress();
  const match = fromStr.match(/<([^>]+)>/);
  const senderEmail = match ? match[1] : fromStr.replace(/"/g, "").trim();

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: "MedAssist AI Clinic", email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo REST API error (${response.status}): ${errText}`);
  }
  return await response.json();
}

/**
 * Generic mail sender: tries SMTP first, falls back to Brevo REST API
 */
async function sendMail({ to, subject, html }) {
  if (!to) {
    console.warn("⚠️ sendMail called without recipient email, skipping.");
    return false;
  }

  const from = getFromAddress();
  try {
    const tx = getTransporter();
    const info = await tx.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent via SMTP to ${to} (from: ${from}):`, info.messageId, info.response || "");
    return true;
  } catch (smtpErr) {
    console.warn(`⚠️ SMTP send failed (${smtpErr.message}). Retrying via Brevo REST API...`);
    try {
      await sendViaBrevoRestApi({ to, subject, htmlContent: html });
      console.log(`📧 Email sent via Brevo REST API to ${to}`);
      return true;
    } catch (apiErr) {
      console.error(`❌ Failed to send email to ${to}:`, apiErr.message);
      return false;
    }
  }
}

/**
 * 1. Send Welcome Email to New Patient with Auto-Generated Password
 */
async function sendPatientWelcomeEmail({ patientName, email, tempPassword, loginUrl }) {
  const portalUrl = loginUrl || process.env.FRONTEND_URL || "http://localhost:8080";
  const subject = `Welcome to MedAssist Clinic — Your Patient Portal Access`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .credentials-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .cred-item { margin-bottom: 12px; }
        .cred-item:last-child { margin-bottom: 0; }
        .cred-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0284c7; }
        .cred-value { font-size: 16px; font-family: monospace; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .alert-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin: 20px 0; font-size: 13px; color: #92400e; }
        .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin: 16px 0; text-align: center; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MedAssist AI Suite</h1>
          <p>Smart Clinic Healthcare Platform</p>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${patientName}!</div>
          <p>Your patient registration has been successfully created at our clinic. An online patient portal account has been set up for you to view your medical prescriptions, schedule, doctor consultation notes, and health records.</p>
          
          <div class="credentials-card">
            <div class="cred-item">
              <div class="cred-label">Login ID / Registered Email</div>
              <div class="cred-value">${email}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Temporary Password</div>
              <div class="cred-value" style="color: #0284c7; background: #ffffff; padding: 6px 10px; border-radius: 6px; display: inline-block;">${tempPassword}</div>
            </div>
          </div>

          <div class="alert-box">
            <strong>⚠️ Security Notice:</strong> This is a temporary auto-generated password. On your very first login, you <strong>must reset your password</strong> to a secure personal password of your choice.
          </div>

          <div style="text-align: center;">
            <a href="${portalUrl}/login" class="btn">Login to Patient Portal</a>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            If you have questions, please reach out to our clinic reception or reply to this message.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} MedAssist AI Suite. Confidential Healthcare Information.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, html });
}

/**
 * 2. Send Appointment / Visit Confirmation Email (New or Returning Patient)
 */
async function sendAppointmentConfirmationEmail({
  patientName, email, doctorName, department, queueNumber, symptoms, vitals, date, estimatedTurnTime
}) {
  const subject = `Appointment Confirmed — Queue #${queueNumber} at MedAssist Clinic`;

  const vitalsSummary = vitals ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 16px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Recorded Initial Vitals:</div>
      <div style="font-size: 13px; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        ${vitals.bp ? `<div><strong>Blood Pressure:</strong> ${vitals.bp}</div>` : ""}
        ${vitals.pulse ? `<div><strong>Pulse:</strong> ${vitals.pulse} bpm</div>` : ""}
        ${vitals.temperature ? `<div><strong>Temperature:</strong> ${vitals.temperature}°F</div>` : ""}
        ${vitals.spo2 ? `<div><strong>SpO2:</strong> ${vitals.spo2}%</div>` : ""}
        ${vitals.weight ? `<div><strong>Weight:</strong> ${vitals.weight} kg</div>` : ""}
      </div>
    </div>
  ` : "";

  const timeBanner = estimatedTurnTime ? `
    <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px; margin: 16px 0; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">Estimated Consultation Time (AI Estimated)</div>
      <div style="font-size: 20px; font-weight: 800; color: #0369a1; margin-top: 4px;">~${estimatedTurnTime}</div>
      <div style="font-size: 12px; color: #0284c7; opacity: 0.8; margin-top: 2px;">Calculated using live queue position & average consultation time</div>
    </div>
  ` : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #f8fafc; padding: 20px; margin: 0; }
        .box { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .head { background: #0284c7; color: white; padding: 24px; text-align: center; }
        .body { padding: 28px; }
        .queue-badge { font-size: 28px; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 8px 18px; border-radius: 12px; display: inline-block; margin: 12px 0; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="head">
          <h2 style="margin: 0;">Consultation Appointment Confirmed</h2>
        </div>
        <div class="body">
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your visit has been registered in today's clinic queue. Please find your visit details below:</p>
          
          <div style="text-align: center;">
            <div class="queue-badge">Queue #${queueNumber}</div>
          </div>

          ${timeBanner}

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Department:</td><td style="padding: 6px 0; font-weight: 600;">${department || "General"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Assigned Doctor:</td><td style="padding: 6px 0; font-weight: 600;">Dr. ${doctorName || "Attending Physician"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Visit Date:</td><td style="padding: 6px 0; font-weight: 600;">${date || new Date().toLocaleDateString("en-IN")}</td></tr>
            ${estimatedTurnTime ? `<tr><td style="padding: 6px 0; color: #64748b;">Estimated Turn:</td><td style="padding: 6px 0; font-weight: 700; color: #0284c7;">${estimatedTurnTime}</td></tr>` : ""}
            ${symptoms ? `<tr><td style="padding: 6px 0; color: #64748b;">Chief Complaint:</td><td style="padding: 6px 0;">${symptoms}</td></tr>` : ""}
          </table>

          ${vitalsSummary}

          <p style="font-size: 13px; color: #64748b;">Please proceed to the waiting lounge when your queue number is called.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, html });
}

/**
 * 3. Notify Doctor of Newly Assigned Patient (with Vitals)
 */
async function sendDoctorNewPatientNotification({
  doctorEmail, doctorName, patientName, patientAge, patientGender, symptoms, queueNumber, vitals
}) {
  if (!doctorEmail) return false;

  const subject = `New Patient Queued: ${patientName} (Queue #${queueNumber})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; color: #1e293b; padding: 20px;">
      <div style="max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h3 style="color: #0284c7; margin-top: 0;">Dr. ${doctorName}, you have a new patient in queue</h3>
        <p><strong>Patient:</strong> ${patientName} (${patientAge || "—"}y, ${patientGender || "—"})</p>
        <p><strong>Queue Number:</strong> #${queueNumber}</p>
        <p><strong>Symptoms:</strong> ${symptoms || "General checkup"}</p>
        ${vitals ? `
          <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; margin: 12px 0;">
            <strong>Vitals recorded by reception:</strong><br/>
            BP: ${vitals.bp || "—"} | Pulse: ${vitals.pulse || "—"} bpm | Temp: ${vitals.temperature || "—"}°F | SpO2: ${vitals.spo2 || "—"}% | Wt: ${vitals.weight || "—"} kg
          </div>
        ` : ""}
        <p style="font-size: 13px; color: #64748b;">You can start the consultation from your doctor portal.</p>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: doctorEmail, subject, html });
}

module.exports = {
  sendMail,
  sendPatientWelcomeEmail,
  sendAppointmentConfirmationEmail,
  sendDoctorNewPatientNotification,
};
