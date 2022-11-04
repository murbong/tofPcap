Function Register-NotificationApp {
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory=$true)]$AppID,
        [Parameter(Mandatory=$true)]$AppDisplayName,
        [Parameter(Mandatory=$false)][int]$ShowInSettings = 0
    )
    $HKCR = Get-PSDrive -Name HKCR -ErrorAction SilentlyContinue
    If (!($HKCR))
    {
        New-PSDrive -Name HKCR -PSProvider Registry -Root HKEY_CLASSES_ROOT -Scope Script
    }
    $AppRegPath = "HKCR:\AppUserModelId"
    $RegPath = "$AppRegPath\$AppID"
    If (!(Test-Path $RegPath))
    {
        $null = New-Item -Path $AppRegPath -Name $AppID -Force
    }
    $DisplayName = Get-ItemProperty -Path $RegPath -Name DisplayName -ErrorAction SilentlyContinue | Select -ExpandProperty DisplayName -ErrorAction SilentlyContinue
    If ($DisplayName -ne $AppDisplayName)
    {
        $null = New-ItemProperty -Path $RegPath -Name DisplayName -Value $AppDisplayName -PropertyType String -Force
    }
    $ShowInSettingsValue = Get-ItemProperty -Path $RegPath -Name ShowInSettings -ErrorAction SilentlyContinue | Select -ExpandProperty ShowInSettings -ErrorAction SilentlyContinue
    If ($ShowInSettingsValue -ne $ShowInSettings)
    {
        $null = New-ItemProperty -Path $RegPath -Name ShowInSettings -Value $ShowInSettings -PropertyType DWORD -Force
    }
    Remove-PSDrive -Name HKCR -Force
}
 
#Requires -RunAsAdministrator
$AppID = "kekboom.kawaii"
$AppDisplayName = "Kekboom KAWAII"
Register-NotificationApp -AppID $AppID -AppDisplayName $AppDisplayName