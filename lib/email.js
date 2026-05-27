// Email service - stubbed until SMTP is configured
// When ready, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local

import nodemailer from 'nodemailer'

function getTransporter() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST !== 'smtp.gmail.com'
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  // Stub: just log emails
  return null
}

export async function sendCancellationEmail({ client, reason, recipients }) {
  const subject = `Rescisão de Contrato - ${client.name}`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #EC4899; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">InvoiceContent</h1>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Aviso de Rescisão Contratual</h2>
        <p style="color: #374151; margin-bottom: 8px;">O contrato do cliente <strong>${client.name}</strong> foi rescindido.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #374151; margin: 0 0 8px 0;"><strong>Cliente:</strong> ${client.name}</p>
          <p style="color: #374151; margin: 0 0 8px 0;"><strong>Email:</strong> ${client.email}</p>
          <p style="color: #374151; margin: 0 0 8px 0;"><strong>Tipo de Fee:</strong> ${client.fee_type === 'mensal' ? 'Fee Mensal' : 'Fee Único'}</p>
          <p style="color: #374151; margin: 0;"><strong>Motivo da rescisão:</strong><br/>${reason || 'Não informado'}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Este email foi enviado automaticamente pelo sistema InvoiceContent.</p>
      </div>
    </div>
  `

  const transporter = getTransporter()

  if (!transporter) {
    // Stub: log to console
    console.log('\n========== EMAIL STUB ==========')
    console.log('To:', recipients.join(', '))
    console.log('Subject:', subject)
    console.log('Client:', client.name)
    console.log('Reason:', reason)
    console.log('================================\n')
    return { success: true, stub: true }
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'InvoiceContent'}" <${process.env.FROM_EMAIL || 'noreply@invoicecontent.com'}>`,
      to: recipients.join(', '),
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send:', error)
    return { success: false, error: error.message }
  }
}

export async function sendRenewalEmail({ client, newEndDate, newValue }) {
  const subject = `Renovação de Contrato - ${client.name}`

  const transporter = getTransporter()

  if (!transporter) {
    console.log('\n========== EMAIL STUB ==========')
    console.log('To: financeiro@invoicecontent.com, nicolas@invoicecontent.com')
    console.log('Subject:', subject)
    console.log('Client:', client.name)
    console.log('New end date:', newEndDate)
    console.log('New value:', newValue)
    console.log('================================\n')
    return { success: true, stub: true }
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'InvoiceContent'}" <${process.env.FROM_EMAIL || 'noreply@invoicecontent.com'}>`,
      to: 'financeiro@invoicecontent.com, nicolas@invoicecontent.com',
      subject,
      html: `<p>Contrato de ${client.name} renovado até ${newEndDate} por R$ ${newValue}.</p>`,
    })
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send:', error)
    return { success: false, error: error.message }
  }
}
