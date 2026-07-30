pipeline {
  agent any

  environment {
    AWS_REGION     = 'us-east-1'
    S3_BUCKET_NAME = 'jcs-raju-sunotal-final'
  }

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Validate Syntax') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
          sh '''
            set -e
            echo "Validating Packer template syntax..."
            cd packer
            packer init .
            packer validate .

            echo "Validating Terraform configuration syntax..."
            cd ../terraform
            terraform fmt -check || true
            terraform init -backend=false -upgrade
            terraform validate
          '''
        }
      }
    }

    stage('Resolve or Build AMI') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
          sh '''
            set -e
            EXISTING_AMI=$(aws ec2 describe-images \
              --owners self \
              --filters "Name=tag:Project,Values=sunotal" "Name=state,Values=available" \
              --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' \
              --output text 2>/dev/null || echo "")

            if [ -n "$EXISTING_AMI" ] && [ "$EXISTING_AMI" != "None" ]; then
              echo "✅ Found existing tagged AMI: $EXISTING_AMI. Reusing AMI."
              echo "$EXISTING_AMI" > /tmp/resolved_ami.id
            else
              echo "Building new base AMI with Packer..."
              cd packer
              packer build -var="aws_region=${AWS_REGION}" .
              AMI_ID=$(grep -o '"artifact_id": *"[^"]*"' packer-manifest.json | tail -n1 | cut -d '"' -f4 | cut -d ':' -f2)
              echo "$AMI_ID" > /tmp/resolved_ami.id
            fi
          '''
        }
      }
    }

    stage('Deploy Infrastructure with Terraform') {
      steps {
        withCredentials([
          usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY'),
          sshUserPrivateKey(credentialsId: 'EC2_SSH_KEY', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')
        ]) {
          sh '''
            set -e
            AMI_ID=$(cat /tmp/resolved_ami.id)
            echo "Deploying Infrastructure with AMI ID: $AMI_ID"

            chmod 600 $SSH_KEY
            PUB_KEY=$(ssh-keygen -y -f $SSH_KEY)

            # Ensure S3 Bucket & Versioning
            aws s3api head-bucket --bucket "${S3_BUCKET_NAME}" 2>/dev/null || \
            aws s3api create-bucket --bucket "${S3_BUCKET_NAME}" --region "${AWS_REGION}" || true
            aws s3api put-bucket-versioning --bucket "${S3_BUCKET_NAME}" --versioning-configuration Status=Enabled || true

            cd terraform
            terraform init -upgrade

            # Resource Auto-Import Check
            STATE_LIST=$(terraform state list 2>/dev/null || echo "")

            if ! echo "$STATE_LIST" | grep -q "aws_iam_role.ec2_s3_role"; then
              if aws iam get-role --role-name sunotal-ec2-s3-access-role >/dev/null 2>&1; then
                terraform import -var="ami_id=${AMI_ID}" -var="key_name=jcs_raju_laptop" module.iam.aws_iam_role.ec2_s3_role sunotal-ec2-s3-access-role || true
              fi
            fi

            if ! echo "$STATE_LIST" | grep -q "aws_vpc.main"; then
              VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=sunotal-vpc" --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "")
              if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
                terraform import -var="ami_id=${AMI_ID}" -var="key_name=jcs_raju_laptop" module.vpc.aws_vpc.main "$VPC_ID" || true
              fi
            fi

            terraform plan -var="ami_id=${AMI_ID}" -var="key_name=jcs_raju_laptop"
            terraform apply -auto-approve -var="ami_id=${AMI_ID}" -var="key_name=jcs_raju_laptop"
          '''
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    success {
      echo '✅ Infrastructure pipeline executed successfully.'
    }
    failure {
      echo '❌ Infrastructure pipeline failed. Please review execution logs.'
    }
  }
}
