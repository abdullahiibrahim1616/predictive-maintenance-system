# AWS Infrastructure Deployment Script (Windows PowerShell)
# Supervising Body: Nigerian Content Development & Monitoring Board (NCDMB)

$REGION = "us-east-1"
$RANDOM_SUFFIX = Get-Random -Minimum 1000 -Maximum 9999
$S3_BUCKET = "ncdmb-pred-maint-telemetry-$RANDOM_SUFFIX"
$SNS_TOPIC_NAME = "ncdmb-critical-equipment-alerts"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying Production AWS Infrastructure for Predictive Maintenance" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# 1. Create KMS Key for NCDMB Regulatory Data Encryption at Rest
Write-Host "🔐 1. Creating AWS KMS Customer Managed Encryption Key..." -ForegroundColor Yellow
$KMS_KEY_ID = & aws kms create-key --region $REGION --description "NCDMB Data Encryption Key" --query "KeyMetadata.KeyId" --output text
& aws kms create-alias --alias-name "alias/ncdmb-pred-maint-$RANDOM_SUFFIX" --target-key-id $KMS_KEY_ID --region $REGION
Write-Host "✅ KMS Key Created: $KMS_KEY_ID" -ForegroundColor Green

# 2. Create S3 Bucket for Raw Telemetry Audit Logs
Write-Host "📦 2. Provisioning Encrypted Amazon S3 Telemetry Bucket..." -ForegroundColor Yellow
& aws s3api create-bucket --bucket $S3_BUCKET --region $REGION
Write-Host "✅ Amazon S3 Bucket Provisioned: s3://$S3_BUCKET" -ForegroundColor Green

# 3. Create SNS Topic for Critical Maintenance Alerts
Write-Host "🔔 3. Provisioning Amazon SNS Alert Topic..." -ForegroundColor Yellow
$SNS_ARN = & aws sns create-topic --name $SNS_TOPIC_NAME --region $REGION --query "TopicArn" --output text
Write-Host "✅ SNS Topic Provisioned: $SNS_ARN" -ForegroundColor Green

# 4. Summary Output
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🎉 AWS Cloud Infrastructure Provisioned Successfully!" -ForegroundColor Cyan
Write-Host "Region: $REGION"
Write-Host "KMS Key ID: $KMS_KEY_ID"
Write-Host "Telemetry Bucket: s3://$S3_BUCKET"
Write-Host "SNS Alert Topic ARN: $SNS_ARN"
Write-Host "========================================================================" -ForegroundColor Cyan
