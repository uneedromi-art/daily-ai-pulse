# Daily AI Pulse — Windows toast (파일 기반, EncodedCommand 미사용)
param(
    [Parameter(Mandatory = $true)]
    [string]$PayloadPath
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path -LiteralPath $PayloadPath)) {
    Write-Error "Payload not found: $PayloadPath"
}

$payload = Get-Content -LiteralPath $PayloadPath -Raw -Encoding UTF8 | ConvertFrom-Json
$title = [System.Security.SecurityElement]::Escape([string]$payload.title)
$body = [System.Security.SecurityElement]::Escape([string]$payload.body)
$siteUrl = [string]$payload.url
$urlArg = [System.Security.SecurityElement]::Escape($siteUrl)
$actionLabel = [System.Security.SecurityElement]::Escape([string]$payload.actionLabel)

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml([string]::Format(
    '<toast launch="{0}"><visual><binding template="{1}"><text id="1">{2}</text><text id="2">{3}</text></binding></visual><actions><action content="{4}" arguments="{0}" activationType="protocol"/></actions></toast>',
    $urlArg,
    'ToastText02',
    $title,
    $body,
    $actionLabel
))

$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$reg = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Daily AI Pulse')
$handler = [Windows.Foundation.TypedEventHandler[Windows.UI.Notifications.ToastNotification, object]]::new({
    param($sender, $e)
    if ($siteUrl) {
        Start-Process $siteUrl
    }
})
$toast.Add_Activated($handler)
$reg.Show($toast)
