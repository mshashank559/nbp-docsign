const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { google } = require('googleapis')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue

    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'))

const CLIENT_ID = (process.env.GMAIL_CLIENT_ID || '').trim()
const CLIENT_SECRET = (process.env.GMAIL_CLIENT_SECRET || '').trim()
const REDIRECT_URI = (process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000').trim()
const SENDER_EMAIL = (process.env.GMAIL_SENDER_EMAIL || 'enroll@netbounceplacement.com').trim()
const CLIENT_PROJECT_NUMBER = CLIENT_ID.split('-')[0]
const SCOPES = (process.env.GMAIL_OAUTH_SCOPES || 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose')
  .split(/[,\s]+/)
  .map(scope => scope.trim())
  .filter(Boolean)

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env.local')
  process.exit(1)
}

if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(CLIENT_ID)) {
  console.error('GMAIL_CLIENT_ID is invalid.')
  console.error('It must look like: 901958894812-xxxxx.apps.googleusercontent.com')
  console.error(`Current project/client prefix: ${CLIENT_ID.slice(0, 24)}`)
  process.exit(1)
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  login_hint: SENDER_EMAIL,
  include_granted_scopes: true,
  state: `nbg-docsign-${CLIENT_PROJECT_NUMBER}-${Date.now()}`,
  scope: SCOPES,
})

const authUrlPath = path.join(process.cwd(), 'gmail-auth-url.txt')
fs.writeFileSync(authUrlPath, `${authUrl}\n`)

console.log('\n--- COPY THIS LINK INTO CHROME ---')
console.log(authUrl)
console.log('----------------------------------\n')
console.log(`Sign in as: ${SENDER_EMAIL}`)
console.log(`OAuth project: ${CLIENT_PROJECT_NUMBER}`)
console.log(`Redirect URI: ${REDIRECT_URI}`)
console.log(`Scopes: ${SCOPES.join(', ')}`)
console.log(`Full URL also saved to: ${authUrlPath}`)
console.log('\nIf Google shows "invalid_client", close old Google auth tabs and use only the newly saved URL from gmail-auth-url.txt.')
console.log('If Google shows "access_denied", add this exact email as a Test user in the OAuth consent screen for this exact Google Cloud project.\n')
console.log('After Google redirects, copy only the code= value from the URL.\n')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Enter the code from the URL bar here: ', code => {
  rl.close()

  const cleanCode = code.trim().replace(/^.*[?&]code=([^&]+).*$/, '$1')
  oAuth2Client.getToken(decodeURIComponent(cleanCode), (err, token) => {
    if (err) {
      console.error('Error getting token:', err.response ? err.response.data : err.message)
      return
    }

    if (!token.refresh_token) {
      console.error('Google did not return a refresh token. Revoke this app access in the Google account, then run again.')
      return
    }

    console.log('\nREFRESH TOKEN:')
    console.log(token.refresh_token)
    console.log('\nAdd it to .env.local as GMAIL_REFRESH_TOKEN, then restart the dev server.')
  })
})
