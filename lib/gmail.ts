import { google } from 'googleapis';
import { SenderRole } from './rbac'

type GmailAttachment = {
  filename: string
  contentType: string
  content: Buffer
}

type GmailMessageInput = {
  to: string
  senderDisplayName?: string
  subject: string
  text?: string
  html?: string
  attachments?: GmailAttachment[]
}

const DEFAULT_SENDER_EMAIL = 'enroll@netbounceplacement.com'
const DEFAULT_REDIRECT_URI = 'http://localhost:3000'
const ROLE_PREFIX: Record<SenderRole, string> = {
  HR: 'HR_',
  ACCOUNTS: 'ACCOUNTS_',
  DEFAULT: '',
}

function envValue(key: string) {
  return (process.env[key] || '').trim().replace(/^['"]|['"]$/g, '')
}

function roleEnvValue(role: SenderRole | undefined, key: string) {
  const normalizedRole = role || 'DEFAULT'
  const prefixed = ROLE_PREFIX[normalizedRole] ? envValue(`${ROLE_PREFIX[normalizedRole]}${key}`) : ''
  return prefixed || envValue(key)
}

export function getSenderEmail(role?: SenderRole) {
  return roleEnvValue(role, 'GMAIL_SENDER_EMAIL') || roleEnvValue(role, 'GMAIL_USER') || DEFAULT_SENDER_EMAIL
}

function getOAuthClient(role?: SenderRole) {
  const clientId = roleEnvValue(role, 'GMAIL_CLIENT_ID')
  const clientSecret = roleEnvValue(role, 'GMAIL_CLIENT_SECRET')
  const refreshToken = roleEnvValue(role, 'GMAIL_REFRESH_TOKEN')

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      ok: false as const,
      reason: 'Gmail is not configured. Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN.',
    }
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, roleEnvValue(role, 'GMAIL_REDIRECT_URI') || DEFAULT_REDIRECT_URI)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  return { ok: true as const, client: oAuth2Client }
}

export function getGmailConfigStatus() {
  const required = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'] as const
  const missing = required.filter(key => !envValue(key))
  const senderEmail = getSenderEmail()

  return {
    configured: missing.length === 0,
    missing,
    senderEmail,
  }
}

export async function getGmailAccessToken(role?: SenderRole) {
  const auth = getOAuthClient(role)
  if (!auth.ok) return { ok: false as const, reason: auth.reason, details: null }

  try {
    const token = await auth.client.getAccessToken()
    return { ok: true as const, accessToken: token.token || '' }
  } catch (error: any) {
    return {
      ok: false as const,
      reason: error?.message || 'Gmail access token request failed',
      details: error?.response?.data || null,
    }
  }
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function encodeMimeHeader(value: string) {
  return `=?utf-8?B?${Buffer.from(value).toString('base64')}?=`
}

function buildRawMessage(input: GmailMessageInput, role?: SenderRole) {
  const fromEmail = getSenderEmail(role)
  const fromName = input.senderDisplayName || 'NetBounce Placement LLC'
  const body = input.html || input.text || ''
  const bodyType = input.html ? 'text/html' : 'text/plain'
  const attachments = input.attachments || []

  if (!attachments.length) {
    return [
      `From: "${fromName}" <${fromEmail}>`,
      `To: ${input.to}`,
      `Subject: ${encodeMimeHeader(input.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: ${bodyType}; charset=utf-8`,
      '',
      body,
    ].join('\r\n')
  }

  const boundary = `nbg-docsign-${Date.now()}`
  const lines = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: ${bodyType}; charset=utf-8`,
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ]

  for (const attachment of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      attachment.content.toString('base64'),
    )
  }

  lines.push(`--${boundary}--`)
  return lines.join('\r\n')
}

export async function sendGmailMessage(input: GmailMessageInput, role?: SenderRole) {
  const auth = getOAuthClient(role)
  if (!auth.ok) return { ok: false as const, reason: auth.reason }

  try {
    const gmail = google.gmail({ version: 'v1', auth: auth.client })
    const raw = encodeBase64Url(buildRawMessage(input, role))
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return { ok: true as const, messageId: result.data.id || '' }
  } catch (error: any) {
    return {
      ok: false as const,
      reason: error?.message || 'Gmail send failed',
      status: error?.code || error?.response?.status,
      details: error?.response?.data || null,
    }
  }
}

export async function createGmailDraft(input: GmailMessageInput, role?: SenderRole) {
  const auth = getOAuthClient(role)
  if (!auth.ok) return { ok: false as const, reason: auth.reason }

  try {
    const gmail = google.gmail({ version: 'v1', auth: auth.client })
    const raw = encodeBase64Url(buildRawMessage(input, role))
    const result = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw },
      },
    })
    const draftId = result.data.id || ''

    return {
      ok: true as const,
      draftId,
      url: draftId ? `https://mail.google.com/mail/u/0/#drafts/${draftId}` : 'https://mail.google.com/mail/u/0/#drafts',
    }
  } catch (error: any) {
    return {
      ok: false as const,
      reason: error?.message || 'Gmail draft creation failed',
      status: error?.code || error?.response?.status,
      details: error?.response?.data || null,
    }
  }
}

export async function sendESignEmail(docType: string, recipientEmail: string) {
  // 1. Setup OAuth2 Client using your .env.local variables
  const oAuth2Client = new google.auth.OAuth2(
    roleEnvValue('DEFAULT', 'GMAIL_CLIENT_ID'),
    roleEnvValue('DEFAULT', 'GMAIL_CLIENT_SECRET'),
    roleEnvValue('DEFAULT', 'GMAIL_REDIRECT_URI') || DEFAULT_REDIRECT_URI
  );

  // Set the refresh token (you will add this to .env.local soon)
  oAuth2Client.setCredentials({ 
    refresh_token: roleEnvValue('DEFAULT', 'GMAIL_REFRESH_TOKEN')
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  // 2. LOGIC: Define names based on Document Type
  const mainEmail = getSenderEmail('DEFAULT');
  let senderDisplayName = "Netbounce Placement LLC"; // Default
  let subject = "New Document for Signature";

  if (docType.includes("Agreement")) {
    senderDisplayName = "Netbounce Legal";
    subject = "Action Required: Sign your Agreement";
  } 
  else if (docType.includes("Performa")) {
    senderDisplayName = "Netbounce Billing";
    subject = "Your Performa Invoice is Ready";
  } 
  else if (["Offer Letter", "Appointment", "Confirmation"].includes(docType)) {
    senderDisplayName = "Netbounce HR";
    subject = `Important: Your ${docType} Document`;
  }

  // 3. Construct the Email Metadata
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: "${senderDisplayName}" <${mainEmail}>`,
    `To: ${recipientEmail}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    `Hello, <br><br> Please find your <b>${docType}</b> ready for e-signature. <br><br> Regards, <br>${senderDisplayName}`,
  ];

  const message = messageParts.join('\n');

  // 4. Encode the message for Gmail API
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // 5. Send the email
  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    console.log(`Email successfully sent via ${senderDisplayName}`);
  } catch (error) {
    console.error('Gmail API Error:', error);
    throw error;
  }
}
