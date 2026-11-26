pipeline {
    agent any
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    parameters {
        string(name: 'DOTNET_HOME', defaultValue: 'C:/Program Files/dotnet', description: 'Carpeta de .NET SDK 10.0.403')
        string(name: 'SCANNER_HOME', defaultValue: 'C:/Tools/sonarscanner', description: 'Carpeta de dotnet-sonarscanner 12.1.0')
        string(name: 'SONAR_URL', defaultValue: 'http://localhost:9000', description: 'Instancia SonarQube del laboratorio')
    }
    tools { jdk 'JAVA21' }
    environment {
        DOTNET_ROOT = "${params.DOTNET_HOME}"
        DOTNET_CLI_HOME = "${WORKSPACE}/.dotnet-home"
        DOTNET_PROCESSOR_COUNT = '2'
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        MSBUILDDISABLENODEREUSE = '1'
        SONAR_SCANNER_JAVA_OPTS = '-Xmx384m -XX:ActiveProcessorCount=2'
        SONAR_PROJECT = 'eshop-pr7-refactoring'
        RESULTS_DIR = "ci-results/${BUILD_NUMBER}"
    }
    stages {
        stage('Checkout GitHub') {
            steps {
                // Keep Windows long-path support scoped to this checkout.
                powershell 'git init; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git config core.longpaths true; exit $LASTEXITCODE'
                checkout scm
            }
        }
        stage('Preparar herramientas') {
            steps { powershell './ci/pr07.ps1 -Stage Prepare' }
        }
        stage('Iniciar Sonar') {
            steps {
                withCredentials([string(credentialsId: 'pr07-sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    powershell './ci/pr07.ps1 -Stage Begin'
                }
            }
        }
        stage('Compilar proyecto') {
            steps { powershell './ci/pr07.ps1 -Stage Build' }
        }
        stage('Pruebas unitarias') {
            steps { powershell './ci/pr07.ps1 -Stage Test' }
        }
        stage('Sonar y Quality Gate') {
            steps {
                withCredentials([string(credentialsId: 'pr07-sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    powershell './ci/pr07.ps1 -Stage Finish'
                }
            }
        }
    }
    post {
        always {
            script {
                if (fileExists("${env.RESULTS_DIR}/junit.xml")) {
                    junit testResults: "${env.RESULTS_DIR}/junit.xml", allowEmptyResults: false
                }
                archiveArtifacts artifacts: "${env.RESULTS_DIR}/**", allowEmptyArchive: true, fingerprint: true
            }
        }
    }
}
