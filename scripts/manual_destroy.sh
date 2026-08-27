#!/usr/bin/env bash
set -e

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
CLUSTER_NAME="sunotal-cluster"
BUCKET_NAME="jcs-raju-sunotal-final"

echo "========================================================"
echo "      SUNOTAL MANUAL INFRASTRUCTURE TEARDOWN SCRIPT      "
echo "========================================================"

# Step 1: Force Purge ECR Repositories
echo "[1/8] Force Purging ECR Repositories..."
for repo in sunotal-frontend sunotal-auth sunotal-operations sunotal-inventory sunotal-user; do
  if aws ecr describe-repositories --repository-names "$repo" --region "$REGION" >/dev/null 2>&1; then
    echo "  -> Force deleting ECR repository: $repo"
    aws ecr delete-repository --repository-name "$repo" --force --region "$REGION" || true
  fi
done

# Step 2: Purge Non-State S3 Objects (Preserve State File)
echo "[2/8] Purging Application Objects in S3 (Preserving state/*)..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "  -> Purging artifacts/, uploads/, logs/ in s3://${BUCKET_NAME}..."
  aws s3 rm "s3://${BUCKET_NAME}" --recursive --exclude "state/*" --region "$REGION" || true
fi

# Step 3: Deregister Load Balancer Targets
echo "[3/8] Deregistering Load Balancer Target Group Targets..."
for tg in sunotal-frontend-tg sunotal-auth-tg sunotal-operations-tg sunotal-inventory-tg sunotal-user-tg; do
  TG_ARN=$(aws elbv2 describe-target-groups --names "$tg" --query "TargetGroups[0].TargetGroupArn" --output text --region "$REGION" 2>/dev/null || echo "")
  if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
    TARGETS=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --query "TargetHealthDescriptions[*].Target.Id" --output text --region "$REGION" 2>/dev/null || echo "")
    for target in $TARGETS; do
      if [ -n "$target" ] && [ "$target" != "None" ]; then
        echo "  -> Deregistering target $target from $tg..."
        aws elbv2 deregister-targets --target-group-arn "$TG_ARN" --targets Id=$target --region "$REGION" 2>/dev/null || true
      fi
    done
  fi
done

# Step 4: Scale Down & Stop ECS Tasks
echo "[4/8] Scaling Down ECS Services & Stopping Tasks..."
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
echo "[5/8] Tearing Down EKS Node Groups and Cluster..."
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

# Step 6: Clean SSM & ENIs
echo "[6/8] Cleaning SSM Parameters & Unattached ENIs..."
aws ssm delete-parameter --name "/sunotal/compute_target" --region "$REGION" 2>/dev/null || true

ENIS=$(aws ec2 describe-network-interfaces --region "$REGION" --filters "Name=description,Values=*sunotal*,*elbv2*,*aws-K8S*" "Name=status,Values=available" --query "NetworkInterfaces[*].NetworkInterfaceId" --output text 2>/dev/null || echo "")
for eni in $ENIS; do
  if [ -n "$eni" ] && [ "$eni" != "None" ]; then
    echo "  -> Deleting unattached ENI: $eni"
    aws ec2 delete-network-interface --network-interface-id "$eni" --region "$REGION" 2>/dev/null || true
  fi
done

# Step 7: Terraform Teardown
echo "[7/8] Running Terraform Teardown..."
cd terraform
terraform init -upgrade
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop" -var="compute_target=eks" || true
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop" -var="compute_target=ecs" || true
terraform destroy -auto-approve -lock=false -var="key_name=jcs_raju_laptop"
cd ..

# Step 8: CloudWatch Log Groups Clean
echo "[8/8] Cleaning CloudWatch Log Groups..."
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
