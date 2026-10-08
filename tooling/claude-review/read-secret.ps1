# Private child-process pipe adapter; never invoke directly to display plaintext.
$ErrorActionPreference = 'Stop'
try {
 if ($env:FORCE_REVIEW_SECRET_PIPE -ne '1' -or -not [Console]::IsOutputRedirected) { throw 'Private pipe required.' }
 . (Join-Path $PSScriptRoot 'secret-storage.ps1')
 $secretPath = Get-ForceSecretPath
 $acl = [IO.File]::GetAccessControl($secretPath)
 $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 if (-not $acl.AreAccessRulesProtected) { throw 'Private ACL required.' }
 foreach ($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])) {
  if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($sid,'S-1-5-18')) { throw 'Unexpected file ACL.' }
 }
 if ((Get-Item -LiteralPath $secretPath).Length -gt 16384) { throw 'Invalid encrypted file size.' }
 $secret = Import-Clixml -LiteralPath $secretPath
 if ($secret -isnot [Security.SecureString]) { throw 'Invalid encrypted type.' }
 $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) }
 finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $secret.Dispose() }
} catch { [Console]::Error.WriteLine('Local encrypted FORCE Review key unavailable; run setup-secret.ps1 as the same Windows user.'); exit 1 }
