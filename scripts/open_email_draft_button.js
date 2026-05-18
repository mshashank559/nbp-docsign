async function openEmailDraft({ recipientEmail, subject, bodyText, filePaths }) {
  const formData = new FormData()
  formData.append('recipient_email', recipientEmail)
  formData.append('subject', subject)
  formData.append('body_text', bodyText || 'Hi [Name], please find the agreements attached.')

  for (const filePath of filePaths) {
    formData.append('file_paths', filePath)
  }

  const response = await fetch('/open-email-draft', {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()
  if (!response.ok || !data.ok || !data.gmail_url) {
    throw new Error(data.error || 'Unable to create Gmail draft.')
  }

  window.location.href = data.gmail_url
}

document.querySelector('#open-email-draft')?.addEventListener('click', async () => {
  try {
    await openEmailDraft({
      recipientEmail: 'client@example.com',
      subject: 'Documents for Review',
      bodyText: 'Hi [Name], please find the agreements attached.',
      filePaths: [
        'C:/path/to/agreement.pdf',
        'C:/path/to/pre-invoice.pdf',
        'C:/path/to/offer-letter.pdf',
      ],
    })
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : 'Unable to create Gmail draft.')
  }
})
