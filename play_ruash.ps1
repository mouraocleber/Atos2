Add-Type -AssemblyName presentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open('C:\Users\Usuario\projetos\Atos2\atos2-antigravity\assets\sounds\ruash.wav')
$player.Play()
Start-Sleep -Seconds 3
