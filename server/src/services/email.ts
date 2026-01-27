import nodemailer from 'nodemailer'
import { configService } from '../utils/configService.js'
import config from '../utils/config.js'

export class EmailService {
    private static instance: EmailService
    private transporter: nodemailer.Transporter | null = null

    private constructor() { }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService()
        }
        return EmailService.instance
    }

    private async createTransporter() {
        // Always refresh config to get latest SMTP settings
        // Optimally we could check if config changed, but for now we rebuild
        // or check if transporter exists and matches config.
        const smtp = configService.smtp

        if (!smtp.host || !smtp.user) {
            console.warn('SMTP not fully configured, email sending disabled.')
            return null
        }

        this.transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure, // true for 465, false for other ports
            auth: {
                user: smtp.user,
                pass: smtp.pass
            }
        })

        return this.transporter
    }

    public async sendEmail(to: string | any, subject?: string, html?: string) {
        try {
            const transporter = await this.createTransporter()
            if (!transporter) return

            const smtp = configService.smtp
            const from = `"${smtp.fromName}" <${smtp.fromEmail}>`

            let mailOptions: any = { from };

            if (typeof to === 'string') {
                mailOptions.to = to;
                mailOptions.subject = subject;
                mailOptions.html = html;
            } else {
                mailOptions = { ...mailOptions, ...to };
            }

            const info = await transporter.sendMail(mailOptions)

            console.log('Message sent: %s', info.messageId)
            return info
        } catch (error) {
            console.error('Error sending email:', error)
            throw error
        }
    }

    public async sendWelcomeEmail(user: { email: string; name: string }) {
        const subject = 'Welcome to Flova.ai!'
        const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Welcome, ${user.name}!</h2>
                <p>Thank you for joining Flova.ai. We are excited to have you on board.</p>
                <p>Start exploring our AI-powered features today!</p>
                <br>
                <p>Best regards,</p>
                <p>The Flova.ai Team</p>
            </div>
        `
        return this.sendEmail(user.email, subject, html)
    }

    public async sendPasswordResetEmail(user: { email: string; name: string }, token: string) {
        const resetLink = `${config.public.baseUrl}/auth/reset-password?token=${token}`

        const subject = 'Password Reset Request'
        const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Hello ${user.name},</h2>
                <p>You requested a password reset. Please click the link below to reset your password:</p>
                <p><a href="${resetLink}" style="color: #007bff;">Reset Password</a></p>
                <p>If you did not request this, please ignore this email.</p>
                <br>
                <p>Best regards,</p>
                <p>The Flova.ai Team</p>
            </div>
        `
        return this.sendEmail(user.email, subject, html)
    }
}

export const emailService = EmailService.getInstance()
