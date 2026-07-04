#!/bin/bash

# Wayta Cloud Run Deployment Script
# Targets: African Region (me-central1 or similar if available, defaulting to europe-west2 as standard for SA)

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="wayta-terminal"
REGION="europe-west2" # Johannesburg region support is rolling out, europe-west2 is the standard for SA latency
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "🚀 Starting Wayta Production Deployment Flow..."

# 1. Build and Push using Cloud Build
echo "📦 Building container image via Cloud Build..."
gcloud builds submit --tag ${IMAGE_NAME} .

# 2. Deploy to Cloud Run
echo "cloud-run-deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars="NODE_ENV=production,VITE_ENV=production" \
  --port 3000

echo "✅ Deployment Complete!"
echo "--------------------------------------------------"
echo "Service URL: $(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')"
echo "--------------------------------------------------"
