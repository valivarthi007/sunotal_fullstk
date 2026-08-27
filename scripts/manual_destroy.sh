#!/usr/bin/env bash
set -e

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
CLUSTER_NAME="sunotal-cluster"
BUCKET_NAME="jcs-raju-sunotal-final"

echo "========================================================"
echo "      SUNOTAL MANUAL INFRASTRUCTURE TEARDOWN SCRIPT      "
echo "========================================================"

# Step 1: Force Purge ECR Repositories
echo "[1/9] Force Purging ECR Repositories..."
for repo in sunotal-frontend sunotal-auth sunotal-operations sunotal-inventory sunotal-user; do
  if aws ecr describe-repositories --repository-names "$repo" --region "$REGION" >/dev/null 2>&1; then
    echo "  -> Force deleting ECR repository: $repo"
    aws ecr delete-repository --repository-name "$repo" --force --region "$REGION" || true
  fi
done

# Step 2: Purge Non-State S3 Objects (Preserve State File)
echo "[2/9] Purging Application Objects in S3 (Preserving state/*)..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "  -> Purging artifacts/, uploads/, logs/ in s3://${BUCKET_NAME}..."
  aws s3 rm "s3://${BUCKET_NAME}" --recursive --exclude "state/*" --region "$REGION" || true
fi

# Step 3: Deregister Load Balancer Targets & Delete ALBs / Target Groups
echo "[3/9] Deregistering & Deleting Load Balancers & Target Groups..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names "sunotal-alb" --region "$REGION" --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || echo "")
if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
  echo "  -> Deleting ALB: sunotal-alb"
  aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN" --region "$REGION" || true
  sleep 15
fi

for tg in sunotal-app-tg sunotal-frontend-tg sunotal-auth-tg sunotal-operations-tg sunotal-inventory-tg sunotal-user-tg; do
  TG_ARN=$(aws elbv2 describe-target-groups --names "$tg" --region "$REGION" --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || echo "")
  if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
    TARGETS=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$REGION" --query "TargetHealthDescriptions[*].Target.Id" --output text 2>/dev/null || echo "")
    for target in $TARGETS; do
      if [ -n "$target" ] && [ "$target" != "None" ]; then
        aws elbv2 deregister-targets --target-group-arn "$TG_ARN" --targets Id=$target --region "$REGION" 2>/dev/null || true
      fi
    done
    echo "  -> Deleting Target Group: $tg"
    aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$REGION" 2>/dev/null || true
  fi
done

# Step 4: Scale Down & Stop ECS Tasks
echo "[4/9] Scaling Down ECS Services & Stopping Tasks..."
if aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$REGION" --query "clusters[0].status" --output text 2>/dev/null | grep -q "ACTIVE"; then
  for svc in sunotal-frontend sunotal-auth sunotal-operations sunotal-inventory sunotal-user; do
    echo "  -> Scaling service $svc down to 0..."
    aws ecs update-service --cluster "$CLUSTER_NAME" --service "$svc" --desired-count 0 --region "$REGION" 2>/dev/null || true
  done
  
  TASKS=$(aws ecs list-tasks --cluster "$CLUSTER_NAME" --region "$REGION" --query "taskArns[]" --output text 2>/dev/null || echo "")
  for task in $TASKS; do
    if [ -n "$task" ] && [ "$task" != "None" ]; then
      echo "  -> Stopping ECS Task: $task"
      aws ecs stop-task --cluster "$CLUSTER_NAME" --task "$task" --reason "Manual teardown" --region "$REGION" 2>/dev/null || true
    fi
  done
fi

# Step 5: Teardown EKS Node Groups & Cluster
echo "[5/9] Tearing Down EKS Node Groups and Cluster..."
if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" >/dev/null 2>&1; then
  NODEGROUPS=$(aws eks list-nodegroups --cluster-name "$CLUSTER_NAME" --region "$REGION" --query "nodegroups[]" --output text 2>/dev/null || echo "")
  for ng in $NODEGROUPS; do
    if [ -n "$ng" ] && [ "$ng" != "None" ]; then
      echo "  -> Deleting EKS Node Group: $ng"
      aws eks delete-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$ng" --region "$REGION" || true
    fi
  done
  
  PROFILES=$(aws eks list-fargate-profiles --cluster-name "$CLUSTER_NAME" --region "$REGION" --query "fargateProfileNames[]" --output text 2>/dev/null || echo "")
  for fp in $PROFILES; do
    if [ -n "$fp" ] && [ "$fp" != "None" ]; then
      echo "  -> Deleting Fargate Profile: $fp"
      aws eks delete-fargate-profile --cluster-name "$CLUSTER_NAME" --fargate-profile-name "$fp" --region "$REGION" || true
    fi
  done

  for ng in $NODEGROUPS; do
    if [ -n "$ng" ] && [ "$ng" != "None" ]; then
      echo "  -> Waiting for EKS Node Group $ng to be fully deleted..."
      aws eks wait nodegroup-deleted --cluster-name "$CLUSTER_NAME" --nodegroup-name "$ng" --region "$REGION" || true
    fi
  done

  echo "  -> Deleting EKS Cluster: $CLUSTER_NAME"
  for attempt in {1..5}; do
    if aws eks delete-cluster --name "$CLUSTER_NAME" --region "$REGION"; then
      echo "  -> Cluster deletion request accepted."
      break
    else
      echo "  -> Retry attempt $attempt... waiting 30 seconds..."
      sleep 30
    fi
  done

  echo "  -> Waiting for EKS cluster deletion to finish..."
  aws eks wait cluster-deleted --name "$CLUSTER_NAME" --region "$REGION" 2>/dev/null || true
fi

# Step 6: Purge RDS, CloudFront OAC, DB Subnet Groups, SSM & ENIs
echo "[6/9] Purging RDS Instances, DB Subnet Groups, CloudFront OAC & ENIs..."
for db in sunotal-postgres raju-sunotal-db; do
  if aws rds describe-db-instances --db-instance-identifier "$db" --region "$REGION" >/dev/null 2>&1; then
    echo "  -> Deleting RDS Instance: $db"
    aws rds delete-db-instance --db-instance-identifier "$db" --skip-final-snapshot --delete-automated-backups --region "$REGION" 2>/dev/null || true
  fi
done

aws rds delete-db-subnet-group --db-subnet-group-name "sunotal-db-subnet-group" --region "$REGION" 2>/dev/null || true

OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='sunotal-s3-oac'].Id" --output text --region "$REGION" 2>/dev/null || echo "")
if [ -n "$OAC_ID" ] && [ "$OAC_ID" != "None" ]; then
  OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" --query "ETag" --output text --region "$REGION" 2>/dev/null || echo "")
  echo "  -> Deleting CloudFront OAC: sunotal-s3-oac ($OAC_ID)"
  aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG" --region "$REGION" 2>/dev/null || true
fi

aws ssm delete-parameter --name "/sunotal/compute_target" --region "$REGION" 2>/dev/null || true

ENIS=$(aws ec2 describe-network-interfaces --region "$REGION" --filters "Name=description,Values=*sunotal*,*elbv2*,*aws-K8S*" "Name=status,Values=available" --query "NetworkInterfaces[*].NetworkInterfaceId" --output text 2>/dev/null || echo "")
for eni in $ENIS; do
  if [ -n "$eni" ] && [ "$eni" != "None" ]; then
    echo "  -> Deleting unattached ENI: $eni"
    aws ec2 delete-network-interface --network-interface-id "$eni" --region "$REGION" 2>/dev/null || true
  fi
done

# Step 7: Purge IAM Roles, Instance Profiles & Policies
echo "[7/9] Purging IAM Roles, Instance Profiles & Custom Policies..."
for role in sunotal-cluster-cluster-role sunotal-cluster-node-group-role sunotal-ec2-s3-access-role sunotal-lambda-s3-delete-role sunotal-fargate-pod-execution-role; do
  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    POLICIES=$(aws iam list-attached-role-policies --role-name "$role" --query "AttachedPolicies[*].PolicyArn" --output text 2>/dev/null || echo "")
    for pol in $POLICIES; do
      aws iam detach-role-policy --role-name "$role" --policy-arn "$pol" 2>/dev/null || true
    done
    INLINES=$(aws iam list-role-policies --role-name "$role" --query "PolicyNames[]" --output text 2>/dev/null || echo "")
    for inline in $INLINES; do
      aws iam delete-role-policy --role-name "$role" --policy-name "$inline" 2>/dev/null || true
    done
    echo "  -> Deleting IAM Role: $role"
    aws iam delete-role --role-name "$role" 2>/dev/null || true
  fi
done

for ip in sunotal-ec2-s3-access-role-profile sunotal-test-server-profile sunotal-sonarqube-profile; do
  if aws iam get-instance-profile --instance-profile-name "$ip" >/dev/null 2>&1; then
    ROLES=$(aws iam get-instance-profile --instance-profile-name "$ip" --query "InstanceProfile.Roles[*].RoleName" --output text 2>/dev/null || echo "")
    for r in $ROLES; do
      aws iam remove-role-from-instance-profile --instance-profile-name "$ip" --role-name "$r" 2>/dev/null || true
    done
    echo "  -> Deleting Instance Profile: $ip"
    aws iam delete-instance-profile --instance-profile-name "$ip" 2>/dev/null || true
  fi
done

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -n "$ACCOUNT_ID" ]; then
  for pol_name in sunotal-github-actions-ecr-ecs sunotal-lambda-s3-delete-policy; do
    POL_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${pol_name}"
    if aws iam get-policy --policy-arn "$POL_ARN" >/dev/null 2>&1; then
      echo "  -> Deleting IAM Policy: $pol_name"
      aws iam delete-policy --policy-arn "$POL_ARN" 2>/dev/null || true
    fi
  done
fi

# Step 8: Terraform Teardown
echo "[8/9] Running Terraform Teardown..."
cd terraform
terraform init -upgrade
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop" -var="compute_target=eks" || true
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop" -var="compute_target=ecs" || true
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop"
cd ..

# Step 9: CloudWatch Log Groups Clean
echo "[9/9] Cleaning CloudWatch Log Groups..."
LOG_GROUPS=$(aws logs describe-log-groups --region "$REGION" --query "logGroups[?contains(logGroupName, 'sunotal')].logGroupName" --output text 2>/dev/null || echo "")
for lg in $LOG_GROUPS; do
  if [ -n "$lg" ] && [ "$lg" != "None" ]; then
    echo "  -> Deleting Log Group: $lg"
    aws logs delete-log-group --log-group-name "$lg" --region "$REGION" 2>/dev/null || true
  fi
done

echo "========================================================"
echo "         MANUAL TEARDOWN COMPLETE SUCCESSFULLY!         "
echo "========================================================"
