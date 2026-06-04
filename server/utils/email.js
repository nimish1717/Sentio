// ============================================================
// Sentio — Email Utility
// Uses nodemailer with Gmail App Password
// Set EMAIL_USER and EMAIL_PASS in .env
// ============================================================

const nodemailer = require("nodemailer");

// Lazy-init transporter so server starts even without email creds
let transporter = null;

function getTransporter() {
    if (!transporter) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("EMAIL_USER and EMAIL_PASS must be set in .env to send emails");
        }
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
            },
        });
    }
    return transporter;
}

/**
 * Send OTP verification email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP
 */
async function sendOtpEmail(to, otp) {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 16px; border: 1px solid #e8e8e8;">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 2.5rem;">🎭</span>
            <h1 style="color: #534AB7; margin: 12px 0 4px; font-size: 1.5rem;">Welcome to Sentio</h1>
            <p style="color: #666; margin: 0; font-size: 0.95rem;">Your emotional movie companion</p>
        </div>

        <p style="color: #444; font-size: 0.95rem; line-height: 1.6;">Use the code below to verify your email and create your account. It expires in <strong>10 minutes</strong>.</p>

        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background: #EEEDFE; border-radius: 12px; padding: 20px 40px;">
                <div style="font-size: 2.2rem; font-weight: 700; letter-spacing: 10px; color: #3C3489; font-family: monospace;">${otp}</div>
            </div>
        </div>

        <p style="color: #888; font-size: 0.85rem; line-height: 1.5;">If you didn't request this, you can safely ignore this email. Someone may have typed your email by mistake.</p>

        <div style="border-top: 1px solid #f0f0f0; margin-top: 24px; padding-top: 16px; text-align: center;">
            <p style="color: #aaa; font-size: 0.78rem; margin: 0;">Sentio — Discover content by how you feel</p>
        </div>
    </div>
    `;

    await getTransporter().sendMail({
        from: `"Sentio 🎭" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${otp} — Your Sentio verification code`,
        html,
    });
}

module.exports = { sendOtpEmail };
