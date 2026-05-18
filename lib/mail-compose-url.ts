export function buildGmailComposeUrl(input: { to: string; subject: string; body: string }) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: input.to,
    su: input.subject,
    body: input.body,
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}
