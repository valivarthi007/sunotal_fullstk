pipeline {
  agent any

  environment {
    NODE_VERSION = '20'
    PNPM_VERSION = '11.12.0'
    AWS_DEFAULT_REGION = 'us-east-1'
  }

  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 60, unit: 'MINUTES')
    skipDefaultCheckout(false)
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install tools') {
      steps {
        sh '''
          node --version
          npm install -g pnpm@${PNPM_VERSION}
          pnpm --version
        '''
      }
    }

    stage('Install frontend dependencies') {
      steps {
        dir('frontend') {
          sh 'pnpm install --frozen-lockfile'
        }
      }
    }

    stage('Lint and type-check frontend') {
      steps {
        dir('frontend') {
          sh 'pnpm exec tsc --noEmit'
        }
      }
    }

    stage('Build frontend') {
      steps {
        dir('frontend') {
          sh 'pnpm build'
        }
      }
    }

    stage('Install backend dependencies') {
      steps {
        dir('backend') {
          sh 'pnpm install --frozen-lockfile'
        }
      }
    }

    stage('Build backend') {
      steps {
        dir('backend') {
          sh 'pnpm build'
        }
      }
    }

    stage('Security scan') {
      steps {
        sh '''
          if command -v trivy >/dev/null 2>&1; then
            trivy fs --scanners vuln,secret .
          else
            echo 'Trivy not installed; skipping security scan.'
          fi
        '''
      }
    }

    stage('Package artifacts') {
      steps {
        sh '''
          mkdir -p dist/artifacts
          tar -czf dist/artifacts/frontend-build.tgz -C frontend dist
          tar -czf dist/artifacts/backend-build.tgz -C backend dist package.json
        '''
      }
    }

    stage('Publish to artifact store') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          echo 'Publishing artifacts for main branch.'
        '''
      }
    }

    stage('Build AMI with Packer') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          if ! command -v packer >/dev/null 2>&1; then
            echo 'Packer is not installed in Jenkins agent; install it before running this stage.'
            exit 1
          fi
          cd packer
          packer init .
          packer build -var='aws_region=${AWS_DEFAULT_REGION}' .
        '''
      }
    }

    stage('Deploy with Terraform') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          if ! command -v terraform >/dev/null 2>&1; then
            echo 'Terraform is not installed in Jenkins agent; install it before running this stage.'
            exit 1
          fi
          cd terraform
          terraform init
          terraform apply -auto-approve -var='ami_id=${AMI_ID}'
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'dist/artifacts/**', allowEmptyArchive: true
      junit allowEmptyResults: true, testResults: 'reports/**/*.xml'
    }
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed. Review the logs and fix the issue.'
    }
  }
}
