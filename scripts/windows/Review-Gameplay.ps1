param([Parameter(Mandatory=$true)][string]$Evidence, [Parameter(Mandatory=$true)][string]$RunId)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$form = New-Object Windows.Forms.Form
$form.Text = 'Nikki gameplay — menselijke beoordeling'
$form.Width = 760; $form.Height = 430
$form.StartPosition = 'CenterScreen'
$label = New-Object Windows.Forms.Label
$label.Text = 'Vink alleen controles aan die je in deze run daadwerkelijk hebt gezien. Niet kunnen beoordelen = FAIL. Open de screenshots en logs in de bewijsmap.'
$label.SetBounds(20,15,700,55); $form.Controls.Add($label)
$questions = @(
 'Het actieve Nina-slot toonde Nikki, niet de oorspronkelijke Nina of een ander personage',
 'Gezicht, ogen, haar, wimpers en kleding waren herkenbaar en correct getextureerd',
 'Lopen, draaien, bukken, guard en verschillende aanvallen vervormden het model correct',
 'Beide oriëntaties en botsingen/geraakt worden waren correct',
 'De geteste gameplay bleef stabiel, zonder crash of zichtbare model-/texturecorruptie'
)
$boxes = @()
for ($i=0; $i -lt $questions.Count; $i++) {
 $box = New-Object Windows.Forms.CheckBox
 $box.Text = $questions[$i]; $box.SetBounds(20,80+($i*45),700,40)
 $form.Controls.Add($box); $boxes += $box
}
$open = New-Object Windows.Forms.Button
$open.Text = 'Bewijsmap openen'; $open.SetBounds(20,325,180,35)
$open.Add_Click({ Invoke-Item $Evidence }); $form.Controls.Add($open)
$save = New-Object Windows.Forms.Button
$save.Text = 'Beoordeling opslaan'; $save.SetBounds(460,325,230,35)
$save.DialogResult = 'OK'; $form.Controls.Add($save)
$accepted = $form.ShowDialog() -eq 'OK'
$items = @(); for ($i=0; $i -lt $boxes.Count; $i++) { $items += @{ check=$questions[$i]; passed=($accepted -and $boxes[$i].Checked) } }
@{ schema='t3cs-human-gameplay/1'; runId=$RunId; reviewedAt=(Get-Date).ToUniversalTime().ToString('o'); source='explicit human review, not automatic verification'; status=$(if($accepted -and @($items | Where-Object { !$_.passed }).Count -eq 0){'PASS'}else{'FAIL'}); checks=$items } | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $Evidence 'human-gameplay.json')
