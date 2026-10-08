[CmdletBinding()]
param([switch]$Remove)
. (Join-Path $PSScriptRoot 'secret-storage.ps1')
$secretPath = Get-ForceSecretPath
if ($Remove) {
 if ([IO.File]::Exists($secretPath)) { [IO.File]::Delete($secretPath) }
 Write-Host 'Local encrypted FORCE Review key removed; this does not revoke the remote key.'
 exit 0
}
if ((Test-Path -LiteralPath $secretPath) -and ((Read-Host 'Replace existing encrypted FORCE secret? Type REPLACE') -cne 'REPLACE')) { exit 0 }
$dir = [IO.Path]::GetDirectoryName($secretPath)
New-Item -ItemType Directory -Path $dir -Force | Out-Null
Set-ForcePrivateAcl $dir $true
$secret = Read-Host 'Enter the FORCE Review Anthropic API key (hidden)' -AsSecureString
try {
 if ($secret.Length -lt 20) { throw 'Incomplete key; nothing stored.' }
 $secret | Export-Clixml -LiteralPath $secretPath -Force
 try { Set-ForcePrivateAcl $secretPath $false } catch { [IO.File]::Delete($secretPath); throw 'ACL restriction failed; encrypted file removed.' }
 Write-Host "FORCE Review key stored encrypted for this Windows user at $secretPath. No API request made."
} finally { if ($null -ne $secret) { $secret.Dispose() } }
