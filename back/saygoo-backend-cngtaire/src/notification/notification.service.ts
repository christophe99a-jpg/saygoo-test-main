import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, message: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"SAYGOO Platform" <${this.configService.get('MAIL_USER')}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">SAYGOO - Notification</h2>
          <p>${message}</p>
          <hr/>
          <small>Plateforme SAYGOO - Gestion Portuaire</small>
        </div>
      `,
    });
  }

  async notifyBLUploaded(email: string, bl_number: string): Promise<void> {
    await this.sendEmail(
      email,
      '📦 Nouveau BL uploadé',
      `Le BL numéro <strong>${bl_number}</strong> a été uploadé avec succès.`,
    );
  }

  async notifyInvoiceGenerated(email: string, amount: number): Promise<void> {
    await this.sendEmail(
      email,
      '💰 Facture générée',
      `Une facture de <strong>${amount} FCFA</strong> a été générée pour votre dossier.`,
    );
  }

  async notifyPaymentValidated(email: string, bl_number: string): Promise<void> {
    await this.sendEmail(
      email,
      '✅ Paiement validé',
      `Le paiement pour le BL <strong>${bl_number}</strong> a été validé avec succès.`,
    );
  }

  async notifyDOValidated(email: string, bl_number: string): Promise<void> {
    await this.sendEmail(
      email,
      '🚛 Delivery Order validé',
      `Le Delivery Order pour le BL <strong>${bl_number}</strong> a été validé. La marchandise est prête à être libérée.`,
    );
  }
}