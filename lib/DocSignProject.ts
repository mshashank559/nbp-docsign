import { copyFile, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

type AgreementFields = Record<string, string>

const execFileAsync = promisify(execFile)
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'agreement-template.docx')

const REPLACEMENTS: Array<{ needle: string; key: string }> = [
  { needle: 'Name:', key: 'agreementName' },
  { needle: 'Address:', key: 'agreementAddress' },
  { needle: 'Contact:', key: 'agreementContact' },
  { needle: 'Enrollment Plan type:', key: 'enrollmentPlanType' },
  { needle: 'Final payment conditions:', key: 'finalPaymentConditions' },
  { needle: 'Current agreed payment condition:', key: 'currentAgreedPaymentCondition' },
]

export async function buildFilledAgreementPdf(fields: AgreementFields) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nbg-agreement-'))
  const docxPath = path.join(tempDir, 'agreement.docx')
  const pdfPath = path.join(tempDir, 'agreement.pdf')
  const scriptPath = path.join(tempDir, 'fill-agreement.ps1')

  try {
    await copyFile(TEMPLATE_PATH, docxPath)
    await writeFile(scriptPath, buildPowerShellScript(docxPath, pdfPath, fields), 'utf8')

    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
    ], { windowsHide: true, timeout: 120000 })

    return readFile(pdfPath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function buildPowerShellScript(docxPath: string, pdfPath: string, fields: AgreementFields) {
  const replacements = REPLACEMENTS
    .map(({ needle, key }) => ({
      needle,
      value: `${needle} ${(fields[key] || '').trim()}`.trim(),
    }))
    .filter(item => item.value !== item.needle)

  const replacementJson = JSON.stringify(replacements).replace(/'/g, "''")
  const authoritySign = (fields.preAuthoritySign || '').trim()

  return `
$ErrorActionPreference = 'Stop'
$docxPath = '${escapePs(docxPath)}'
$pdfPath = '${escapePs(pdfPath)}'
$replacements = '${replacementJson}' | ConvertFrom-Json
$authoritySign = '${escapePs(authoritySign)}'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $null

try {
  $doc = $word.Documents.Open($docxPath)

  foreach ($item in $replacements) {
    $find = $doc.Content.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    [void]$find.Execute($item.needle, $false, $false, $false, $false, $false, $true, 1, $false, $item.value, 2)
  }

  if ($authoritySign) {
    $find = $doc.Content.Find
    $find.ClearFormatting()
    [void]$find.Execute('Authority Signature', $false, $false)
    if ($find.Found) {
      $range = $find.Parent
      $range.Collapse(1)
      $range.InsertBefore($authoritySign + [Environment]::NewLine)
    }
  }

  $doc.Save()
  $doc.ExportAsFixedFormat($pdfPath, 17)
}
finally {
  if ($doc -ne $null) { $doc.Close($false) | Out-Null }
  $word.Quit() | Out-Null
  if ($doc -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
`
}

function escapePs(value: string) {
  return value.replace(/'/g, "''")
}
