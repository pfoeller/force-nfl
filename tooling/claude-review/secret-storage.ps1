# Shared Windows-only storage checks. No stored secret is loaded here.
$ErrorActionPreference = 'Stop'
function Get-ForceSecretPath {
 if ($env:OS -ne 'Windows_NT' -or [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) { throw 'Windows current-user DPAPI required.' }
 $dir = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'FORCE\claude-review'))
 for ($p = New-Object IO.DirectoryInfo($dir); $null -ne $p; $p = $p.Parent) {
  $marker = Join-Path $p.FullName '.git'
  if ([IO.File]::Exists($marker) -or [IO.Directory]::Exists($marker)) { throw 'Secret storage must be outside every Git checkout.' }
  if ($p.Exists -and ($p.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Secret path must not traverse reparse points.' }
 }
 $file = Join-Path $dir 'api-key.clixml'
 if ((Test-Path -LiteralPath $file) -and ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Secret file must not be a reparse point.' }
 return $file
}
function Set-ForcePrivateAcl([string]$Path,[bool]$Directory) {
 $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
 if ($Directory) { $acl = New-Object Security.AccessControl.DirectorySecurity } else { $acl = New-Object Security.AccessControl.FileSecurity }
 $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false)
 foreach ($s in @($sid.Value,'S-1-5-18')) {
  $principal = New-Object Security.Principal.SecurityIdentifier($s)
  if ($Directory) { $r = New-Object Security.AccessControl.FileSystemAccessRule($principal,'FullControl','ContainerInherit,ObjectInherit','None','Allow') }
  else { $r = New-Object Security.AccessControl.FileSystemAccessRule($principal,'FullControl','Allow') }
  $acl.AddAccessRule($r)
 }
 if ($Directory) { [IO.Directory]::SetAccessControl($Path,$acl) } else { [IO.File]::SetAccessControl($Path,$acl) }
}
