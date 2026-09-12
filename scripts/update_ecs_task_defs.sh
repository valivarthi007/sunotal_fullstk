#!/usr/bin/env bash
set -e

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

DOCDB_URI="mongodb://sunotal:sunotalpass123@sunotal-docdb-cluster.cluster-cs1gq0a2wtpu.us-east-1.docdb.amazonaws.com:27017/sunotal?tls=true&tlsAllowInvalidCertificates=true&directConnection=true&retryWrites=false&authMechanism=SCRAM-SHA-1&authSource=admin"

echo "Updating ECS Task Definitions with AWS DocumentDB URI: $DOCDB_URI"

SERVICES=("auth" "operations" "inventory" "user" "delivery" "support")

for svc in "${SERVICES[@]}"; do
  echo "Updating task definition for sunotal-$svc..."
  
  # Fetch latest task definition JSON
  TASK_DEF_JSON=$(aws ecs describe-task-definition --task-definition "sunotal-$svc")
  
  # Extract container definition and update MONGODB_URI
  NEW_CONTAINER_DEF=$(echo "$TASK_DEF_JSON" | jq --arg uri "$DOCDB_URI" '.taskDefinition.containerDefinitions | map(if .name == "'"$svc"'" then (.environment = ([.environment[] | select(.name != "MONGODB_URI")] + [{"name": "MONGODB_URI", "value": $uri}])) else . end)')
  
  # Register new task definition revision
  NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --family "sunotal-$svc" \
    --task-role-arn "arn:aws:iam::143797622495:role/sunotal-ecs-task-role" \
    --execution-role-arn "arn:aws:iam::143797622495:role/sunotal-ecs-execution-role" \
    --network-mode "awsvpc" \
    --requires-compatibilities "FARGATE" \
    --cpu "256" \
    --memory "512" \
    --container-definitions "$NEW_CONTAINER_DEF" \
    --query "taskDefinition.taskDefinitionArn" --output text)
    
  echo "Registered new task definition: $NEW_TASK_DEF_ARN"
  
  # Update service to use new task definition revision
  echo "Updating ECS service sunotal-$svc..."
  aws ecs update-service --cluster sunotal-cluster --service "sunotal-$svc" --task-definition "$NEW_TASK_DEF_ARN" --force-new-deployment > /dev/null
done

echo "✅ All 6 ECS task definitions and services updated successfully!"
