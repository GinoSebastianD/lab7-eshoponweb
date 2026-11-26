# Práctica 07: Refactoring y TDD

Nuestro equipo trabajó sobre el mismo eShopOnWeb de los laboratorios anteriores. El informe no contiene carátula ni video.

- [Informe PDF](Informe_Pr07_Refactoring_TDD_eShopOnWeb.pdf)
- [Tablero privado](https://github.com/users/GinoSebastianD/projects/4) (requiere acceso)
- [Código y commits de development](https://github.com/GinoSebastianD/lab7-eshoponweb/commits/development)
- Issues #17, #18, #19, #20 y #21: responsables, estimación y criterios de aceptación.

## Resultados comprobados

Base: 44/44 pruebas. RED: 50 correctas y 1 fallida (cantidad esperada 2, obtenida 4). Caracterización: 56/56, excluyendo el caso del defecto. GREEN final: 57/57. Añadimos 13 casos.

SonarQube: 269 a 266 incidencias; 3 resueltas y ninguna nueva. Code smells: 232 a 229. Cobertura global: 5,2% a 7,6%. Complejidad cognitiva: 450 a 447. Permanecen 11 bugs y 26 vulnerabilidades en la clasificación tradicional. Los conteos MQR de la interfaz usan otra clasificación: mantenibilidad 208 a 205, fiabilidad 35 y seguridad 26.

## Reproducción de las pruebas

Desde la raíz del repositorio, con .NET SDK 10.0.403:

```powershell
dotnet test tests/UnitTests/UnitTests.csproj --logger "trx;LogFileName=unit-tests.trx" --results-directory .pr07-results --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover
```

El commit cde92fa contiene las pruebas anteriores a la corrección: la prueba SameBuyerTransfer debe fallar allí. development contiene la corrección y los refactorings. No ejecutar una reversión sobre cambios locales; usar un checkout separado para reproducir el estado histórico.

## Reproducción del análisis

Entorno utilizado: SonarQube Community 26.8.0.126808, SonarScanner for .NET 12.1.0, Java 21. La instancia local y sus credenciales no se publican. Configurar SONAR_TOKEN para un proyecto propio:

```powershell
dotnet tool install --global dotnet-sonarscanner --version 12.1.0
dotnet sonarscanner begin /k:eshop-pr7-refactoring /d:sonar.host.url=http://localhost:9000 /d:sonar.token=$env:SONAR_TOKEN /d:sonar.scanner.scanAll=false /d:sonar.cs.opencover.reportsPaths=".pr07-results/**/coverage.opencover.xml" /d:sonar.cs.vstest.reportsPaths=".pr07-results/*.trx"
dotnet build tests/UnitTests/UnitTests.csproj --no-incremental -m:1
dotnet build src/PublicApi/PublicApi.csproj --no-incremental -m:1
dotnet test tests/UnitTests/UnitTests.csproj --no-build --logger "trx;LogFileName=unit-tests.trx" --results-directory .pr07-results --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover
dotnet sonarscanner end /d:sonar.token=$env:SONAR_TOKEN
```

## Evidencias y alcance

`pruebas/` conserva resultados TRX. `sonar/` contiene métricas, incidencias, metadatos del análisis y OpenCover comprimido. `evidencias/` contiene capturas reales y una vista HTML generada desde TRX. Los archivos originales de ejecución pueden incluir rutas locales del equipo de pruebas.

El alcance es el grafo de proyectos de UnitTests/Web más PublicApi, con el mismo perfil antes y después. Las pruebas funcionales y de rendimiento anteriores no se mezclaron con las unitarias de esta práctica. No se realizó una nueva prueba completa de navegador. Las asignaciones son responsabilidades de seguimiento, no atribuciones de autoría de commits a terceros.

## Integración con Jenkins

Nuestro equipo ejecutó el refactoring desde Jenkins 2.568.3: **build #3 SUCCESS**, 57/57 pruebas aprobadas y Quality Gate **OK**. Commit analizado: `a6d41a649ede9c9dd205d33d07b416bcf23220a9`. Las páginas de comparación antes/después conservan el análisis local previo; la última página documenta esta ejecución independiente de CI.

- [Jenkinsfile del repositorio](../../Jenkinsfile)
- [Script de compilación, pruebas y reporte](../../ci/pr07.ps1)
- [Reporte Sonar generado por Jenkins](jenkins/sonar-report.html) (descargar para abrir en el navegador)
- [Métricas y análisis en JSON](jenkins/sonar-report.json)
- [Resultado de Jenkins](jenkins/build.json), [etapas](jenkins/stages.json) y [pruebas](jenkins/tests.json)
- [Consola de la ejecución](jenkins/console.txt), [TRX](jenkins/unit-tests.trx), [JUnit](jenkins/junit.xml) y [cobertura](jenkins/coverage.opencover.zip)

Para reproducirlo en un agente Windows:

1. Disponer de .NET SDK 10.0.403, Java 21, Git y SonarScanner for .NET 12.1.0. Registrar Java en Jenkins como `JAVA21`.
2. Registrar el token del proyecto Sonar como credencial de texto secreto `pr07-sonarqube-token`. El token no forma parte del repositorio.
3. Crear un Pipeline desde SCM: este repositorio, rama `*/development` y archivo `Jenkinsfile`.
4. Ejecutar **Build with Parameters**: `DOTNET_HOME` y `SCANNER_HOME` son las carpetas de las herramientas; `SONAR_URL` identifica el servidor. El proyecto Sonar usado es `eshop-pr7-refactoring`.
5. Revisar las seis etapas, el resultado de pruebas y los artefactos archivados. La ejecución falla si fallan las pruebas, el análisis o la puerta de calidad.

La configuración de Git admite rutas largas solo en este checkout. Nuestro servidor Jenkins se inició sin variables `GIT_CONFIG_*` heredadas del entorno de automatización. La instancia de Jenkins se mantiene en `http://localhost:8080/job/Pr07-eShopOnWeb-Refactoring/` y SonarQube en `http://localhost:9000`; ambos requieren servicios locales activos. No se han expuesto a Internet. Las primeras dos ejecuciones documentaron problemas de entorno y checkout; el resultado archivado corresponde a la ejecución completa que los resolvió.

Referencia: [pruebas y artefactos en Jenkins](https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/).
