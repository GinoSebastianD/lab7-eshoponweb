param([Parameter(Mandatory=$true)][ValidateSet('Prepare','Begin','Build','Test','Finish')][string]$Stage)
$ErrorActionPreference = 'Stop'
$dotnet = Join-Path $env:DOTNET_HOME 'dotnet.exe'
$scanner = Join-Path $env:SCANNER_HOME 'dotnet-sonarscanner.exe'
$results = Join-Path (Get-Location).Path $env:RESULTS_DIR

function Run-Checked([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "El proceso fallo con codigo $LASTEXITCODE" }
}

function Export-JUnit {
    [xml]$trx = Get-Content -LiteralPath (Join-Path $results 'unit-tests.trx') -Raw
    $ns = New-Object System.Xml.XmlNamespaceManager($trx.NameTable)
    $ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
    $counts = $trx.SelectSingleNode('//t:Counters',$ns)
    $doc = New-Object System.Xml.XmlDocument
    $suite = $doc.CreateElement('testsuite')
    $suite.SetAttribute('name','eShopOnWeb.UnitTests')
    foreach ($pair in @(@('tests','total'),@('failures','failed'),@('skipped','notExecuted'))) {
        $suite.SetAttribute($pair[0],$counts.GetAttribute($pair[1]))
    }
    $suite.SetAttribute('errors','0')
    $null = $doc.AppendChild($suite)
    foreach ($result in $trx.SelectNodes('//t:UnitTestResult',$ns)) {
        $case = $doc.CreateElement('testcase')
        $name = $result.GetAttribute('testName')
        $case.SetAttribute('name',$name)
        $case.SetAttribute('classname',$name.Substring(0,$name.LastIndexOf('.')))
        $seconds = ([TimeSpan]::Parse($result.GetAttribute('duration'))).TotalSeconds
        $case.SetAttribute('time',$seconds.ToString([Globalization.CultureInfo]::InvariantCulture))
        if ($result.GetAttribute('outcome') -eq 'Failed') {
            $failure = $doc.CreateElement('failure')
            $failure.InnerText = $result.SelectSingleNode('t:Output/t:ErrorInfo',$ns).InnerText
            $null = $case.AppendChild($failure)
        } elseif ($result.GetAttribute('outcome') -ne 'Passed') {
            $null = $case.AppendChild($doc.CreateElement('skipped'))
        }
        $null = $suite.AppendChild($case)
    }
    $doc.Save((Join-Path $results 'junit.xml'))
    Write-Host "Pruebas: $($counts.total); aprobadas: $($counts.passed); fallidas: $($counts.failed)"
}

function Sonar-Get([string]$Path) {
    $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:SONAR_TOKEN + ':'))
    Invoke-RestMethod -Uri ($env:SONAR_URL.TrimEnd('/') + '/api/' + $Path) -Headers @{Authorization=('Basic '+$auth)} -TimeoutSec 60
}

function Export-SonarReport {
    $properties = @{}
    Get-Content -LiteralPath '.sonarqube/out/.sonar/report-task.txt' | ForEach-Object {
        $parts = $_ -split '=',2
        if ($parts.Length -eq 2) { $properties[$parts[0]] = $parts[1] }
    }
    $task = (Sonar-Get ('ce/task?id=' + $properties['ceTaskId'])).task
    if ($task.status -ne 'SUCCESS') { throw "Analisis Sonar incompleto: $($task.status)" }
    $gate = Sonar-Get ('qualitygates/project_status?analysisId=' + $task.analysisId)
    $metrics = 'bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,cognitive_complexity,ncloc'
    $measure = Sonar-Get ('measures/component?component=' + $env:SONAR_PROJECT + '&metricKeys=' + $metrics)
    $revision = (& git rev-parse HEAD).Trim()
    $report = [ordered]@{
        job=$env:JOB_NAME;build=$env:BUILD_NUMBER;buildUrl=$env:BUILD_URL;revision=$revision
        project=$env:SONAR_PROJECT;analysisId=$task.analysisId;analysisStatus=$task.status
        qualityGate=$gate.projectStatus.status;executedAt=$task.executedAt
        measures=$measure.component.measures
    }
    $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $results 'sonar-report.json') -Encoding UTF8
    $gate | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $results 'quality-gate.json') -Encoding UTF8
    $task | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $results 'analysis.json') -Encoding UTF8
    $rows = ($measure.component.measures | ForEach-Object { '<tr><td>'+[Net.WebUtility]::HtmlEncode($_.metric)+'</td><td>'+[Net.WebUtility]::HtmlEncode($_.value)+'</td></tr>' }) -join ''
    $page = @"
<!doctype html><html lang="es"><meta charset="utf-8"><title>Reporte Sonar - Jenkins</title>
<style>body{font:18px Arial;margin:40px;color:#203547}h1{color:#167c80}table{border-collapse:collapse;width:700px}td,th{border-bottom:1px solid #ddd;text-align:left;padding:12px}th{background:#edf2f6}</style>
<h1>Reporte de Sonar desde Jenkins</h1><p>Nuestro equipo ejecuto compilacion, pruebas y analisis desde el pipeline del repositorio.</p>
<p>Proyecto: $($report.project)<br>Jenkins: $($report.job) #$($report.build)<br>Revision: $revision<br>Analisis: $($report.analysisId)<br>Estado del analisis: $($report.analysisStatus)<br>Quality Gate: <b>$($report.qualityGate)</b></p>
<table><tr><th>Metrica</th><th>Resultado</th></tr>$rows</table><p>Fuente: API de SonarQube; identificador del analisis enviado en esta ejecucion.</p></html>
"@
    $page | Set-Content -LiteralPath (Join-Path $results 'sonar-report.html') -Encoding UTF8
    Write-Host "Sonar: $($task.status); Quality Gate: $($gate.projectStatus.status); Revision: $revision"
    if ($gate.projectStatus.status -ne 'OK') { throw 'La puerta de calidad no esta aprobada' }
}

switch ($Stage) {
    'Prepare' {
        foreach ($file in @($dotnet,$scanner,(Join-Path $env:JAVA_HOME 'bin/java.exe'))) {
            if (-not (Test-Path -LiteralPath $file)) { throw "Herramienta no encontrada: $file" }
        }
        $null = New-Item -ItemType Directory -Force -Path $results
        Run-Checked $dotnet @('--version')
        & git rev-parse HEAD | Set-Content -LiteralPath (Join-Path $results 'commit.txt') -Encoding UTF8
    }
    'Begin' {
        Run-Checked $scanner @('begin',('/k:'+$env:SONAR_PROJECT),('/v:jenkins-'+$env:BUILD_NUMBER),('/d:sonar.host.url='+$env:SONAR_URL),('/d:sonar.token='+$env:SONAR_TOKEN),'/d:sonar.scanner.scanAll=false','/d:sonar.sourceEncoding=UTF-8','/d:sonar.scanner.skipJreProvisioning=true',('/d:sonar.scanner.javaExePath='+(Join-Path $env:JAVA_HOME 'bin/java.exe')),('/d:sonar.cs.opencover.reportsPaths='+$results+'/**/coverage.opencover.xml'),('/d:sonar.cs.vstest.reportsPaths='+$results+'/*.trx'),'/d:sonar.qualitygate.wait=true','/d:sonar.qualitygate.timeout=300')
    }
    'Build' {
        foreach ($project in @('tests/UnitTests/UnitTests.csproj','src/PublicApi/PublicApi.csproj')) {
            Run-Checked $dotnet @('build',$project,'--no-incremental','-m:1','/p:UseSharedCompilation=false','/nodeReuse:false')
        }
    }
    'Test' {
        & $dotnet test tests/UnitTests/UnitTests.csproj --no-build --logger 'trx;LogFileName=unit-tests.trx' --results-directory $results '--collect:XPlat Code Coverage' -- 'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover'
        $testExit = $LASTEXITCODE
        Export-JUnit
        if ($testExit -ne 0) { throw "Pruebas fallidas: codigo $testExit" }
    }
    'Finish' {
        & $scanner end ('/d:sonar.token='+$env:SONAR_TOKEN)
        $scanExit = $LASTEXITCODE
        if (Test-Path -LiteralPath '.sonarqube/out/.sonar/report-task.txt') { Export-SonarReport }
        if ($scanExit -ne 0) { throw "Sonar fallo: codigo $scanExit" }
    }
}
