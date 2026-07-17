pipeline {
  agent any

  environment {
    AWS_DEFAULT_REGION = 'us-east-1'
  }

  options {
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
    skipDefaultCheckout(false)
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build base AMI with Packer') {
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

    stage('Deploy infrastructure with Terraform') {
      steps {
        sh '''
          if ! command -v terraform >/dev/null 2>&1; then
            echo 'Terraform is not installed in Jenkins agent; install it before running this stage.'
            exit 1
          fi
          
          # Extract AMI ID from Packer manifest
          if [ ! -f "packer/packer-manifest.json" ]; then
            echo 'Packer manifest not found. Make sure Packer built the AMI successfully.'
            exit 1
          fi
          
          AMI_ID=$(grep -o '"artifact_id": *"[^"]*"' packer/packer-manifest.json | tail -n1 | cut -d '"' -f4 | cut -d ':' -f2)
          
          if [ -z "$AMI_ID" ]; then
            echo "Failed to extract AMI_ID from packer-manifest.json"
            exit 1
          fi
          
          echo "Using AMI ID: $AMI_ID"
          
          cd terraform
          terraform init
          terraform apply -auto-approve -var="ami_id=${AMI_ID}"
        '''
      }
    }

    stage('Trigger Application Deployment') {
      steps {
        build job: 'sunotal-deploy', wait: false
      }
    }
  }

  post {
    success {
      echo 'Infrastructure provisioned successfully. Triggered deployment pipeline.'
    }
    failure {
      echo 'Infrastructure pipeline failed. Review the logs and fix the issue.'
    }
  }
}
