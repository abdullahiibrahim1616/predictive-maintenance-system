#!/bin/bash
# AWS Infrastructure Deployment Script for Nigerian O&G Predictive Maintenance Platform
# Supervising Body: Nigerian Content Development & Monitoring Board (NCDMB)

set -e

REGION="eu-west-1"
STACK_NAME="ncdmb-pred-maint-stack"
S3_BUCKET="ncdmb-pred-maint-telemetry-storage-2026"
SNS_TOPIC_NAME="ncdmb-critical-equipment-alerts"

echo "========================================================================"
echo "🚀 Deploying Production AWS Infrastructure for Predictive Maintenance"
echo "========================================================================"

# 1. Create KMS Key for NCDMB Regulatory Data Encryption at Rest
echo "🔐 1. Creating AWS KMS Customer Managed Encryption Key..."
KMS_KEY_ID=$(aws kms create-key --region $REGION --description "NCDMB O&G Predictive Maintenance Master Encryption Key" --query KeyMetadata.KeyId --output text)
aws kms enable-key-rotation --key-id "$KMS_KEY_ID" --region "$REGION"
aws kms create-alias --alias-name alias/ncdmb-pred-maint-key --target-key-id $KMS_KEY_ID --region $REGION
echo "✅ KMS Key Created: $KMS_KEY_ID"

# 2. Create S3 Bucket for Raw Telemetry Audit Logs
echo "📦 2. Provisioning Encrypted Amazon S3 Telemetry Bucket..."
aws s3api create-bucket --bucket $S3_BUCKET --region $REGION --create-bucket-configuration LocationConstraint=$REGION
aws s3api put-bucket-encryption --bucket $S3_BUCKET --server-side-encryption-configuration '{
  "Rules": [{
    "ApplyServerSideEncryptionByDefault": {
      "SSEAlgorithm": "aws:kms",
      "KMSMasterKeyID": "'$KMS_KEY_ID'"
    }
  }]
}'
echo "✅ Amazon S3 Bucket Encrypted with KMS: s3://$S3_BUCKET"

# 3. Create SNS Topic for Critical Maintenance Alerts
echo "🔔 3. Provisioning Amazon SNS Alert Topic..."
SNS_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --region $REGION --query TopicArn --output text)
echo "✅ SNS Topic Provisioned: $SNS_ARN"

# 4. Summary Output
echo "========================================================================"
echo "🎉 AWS Cloud Infrastructure Provisioned Successfully!"
echo "Region: $REGION"
echo "KMS Key ID: $KMS_KEY_ID"
echo "Telemetry Bucket: s3://$S3_BUCKET"
echo "SNS Alert Topic ARN: $SNS_ARN"
echo "Configure the application with AWS_REGION=$REGION, AWS_S3_BUCKET=$S3_BUCKET, AWS_SNS_TOPIC_ARN=$SNS_ARN, AWS_KMS_KEY_ID=$KMS_KEY_ID"
echo "========================================================================"
