#!/usr/bin/env bash
set -e

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ECR_REGISTRY="143797622495.dkr.ecr.us-east-1.amazonaws.com"

echo "Logging in to AWS ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_REGISTRY"

SERVICES=("auth" "operations" "inventory" "user" "delivery" "support")

for svc in "${SERVICES[@]}"; do
  echo "Building docker image for sunotal-$svc..."
  docker build -t "$ECR_REGISTRY/sunotal-$svc:latest" "./services/${svc}-service"
  
  echo "Pushing $ECR_REGISTRY/sunotal-$svc:latest to ECR..."
  docker push "$ECR_REGISTRY/sunotal-$svc:latest"
done

echo "Forcing new deployment on all ECS services..."
for svc in "${SERVICES[@]}"; do
  aws ecs update-service --cluster sunotal-cluster --service "sunotal-$svc" --force-new-deployment > /dev/null
done

echo "✅ All 6 microservice Docker images built, pushed to ECR, and ECS deployments triggered!"
