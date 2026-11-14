# Docker Compose Deployment

The Compose stack runs the main API, PostgreSQL, the main frontend, and the optional RBAC admin portal. PostgreSQL and application credentials are read from local secret files mounted into their containers; do not put secret values in `.env` or commit them. SQLite is retained only as a local/test dependency; the production image excludes it and uses PostgreSQL.

## Prepare secrets (PowerShell)

From the repository root:

```powershell
Copy-Item .env.example .env
New-Item -ItemType Directory -Force .secrets | Out-Null
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
foreach ($name in @('postgres_password', 'jwt_secret', 'bootstrap_admin_password', 'rbac_jwt_secret', 'rbac_bootstrap_password')) {
    $bytes = New-Object byte[] 48
    $rng.GetBytes($bytes)
    [IO.File]::WriteAllText((Join-Path '.secrets' $name), [Convert]::ToBase64String($bytes), [Text.Encoding]::ASCII)
    [Array]::Clear($bytes, 0, $bytes.Length)
}
$rng.Dispose()
```

Edit `.env` and set unique administrator email addresses. The frontend ports bind to `127.0.0.1` by default, keeping this local setup off other network interfaces. If a separate ingress must connect directly, set `APP_BIND_ADDRESS` and `RBAC_APP_BIND_ADDRESS` to the intended host interface addresses and secure access with a firewall and TLS-terminating reverse proxy. Set `APP_ORIGIN` and `RBAC_APP_ORIGIN` to the exact HTTPS origins users will access; set `APP_PORT` and `RBAC_APP_PORT` only if the host ports need to change. Keep `.env` and `.secrets/` private and backed up securely.

The main app and RBAC portal bootstrap a single administrator apiece only when their databases are empty. The passwords come from `bootstrap_admin_password` and `rbac_bootstrap_password`. The main production seed intentionally does not create the development demo users. If a database volume was previously initialized with demo credentials, rotate/remove those accounts before exposing it; initialization does not overwrite existing users.

## Optional AWS integrations

The main backend can archive ingested telemetry to S3, publish critical SMS/email alerts through SNS, and enable automatic rotation for a configured KMS key. Set these values in the private `.env` file:

- `AWS_REGION` is required for AWS calls.
- `AWS_S3_BUCKET` enables telemetry JSON archival. `AWS_S3_PREFIX` defaults to `telemetry`. Set `AWS_KMS_KEY_ID` to request SSE-KMS encryption for each archived object; otherwise the bucket's default encryption applies.
- Set `AWS_SNS_ENABLED=true` to enable real alert delivery. `AWS_SNS_SMS_PHONE` is the configured SMS destination; `AWS_SNS_TOPIC_ARN` is the topic for email-alert fan-out. Configure and confirm topic subscriptions in SNS. The backend does not send arbitrary request-supplied phone numbers through AWS.
- `AWS_KMS_KEY_ID` also selects the key for the protected KMS rotation endpoints. Rotation means enabling AWS-managed automatic key rotation; AWS schedules key-material rotation.

When SNS is disabled, notifications are recorded as `SIMULATED`. When enabled, missing destinations or AWS failures are recorded/reported as failures rather than silently falling back to simulation. S3 archival is reported as `DISABLED`, `ARCHIVED`, or `FAILED` in the telemetry-ingest response; a failed archive does not undo telemetry already committed to PostgreSQL.

The backend uses the AWS SDK default credential provider chain and contains no AWS access keys. In AWS, grant the application an IAM role with `s3:PutObject` on the telemetry prefix, `sns:Publish` for the configured topic and SMS delivery, and `kms:GetKeyRotationStatus`/`kms:EnableKeyRotation` for the configured key. SSE-KMS writes also require `kms:GenerateDataKey`. For local Docker, provide AWS credentials through an approved local credential-provider setup; do not put access keys in `.env` or Compose.

`GET /api/v1/security/kms/rotation` reports the configured key's automatic-rotation state, and `POST` to the same path enables rotation. Both require an authenticated user with `kms.rotate`; the action is audit logged. The infrastructure script provisions resources only and does not attach an IAM role or deploy the application.

## Build, start, and smoke-test

With Docker Engine and the Docker Compose plugin installed:

```powershell
docker compose config --quiet
docker compose up --build --detach
docker compose ps
```

All five services should report healthy/running. Nginx serves the main UI at `http://localhost:3000` and proxies `/api/v1/*` to the main API. The RBAC portal is at `http://localhost:3001` and proxies `/api/*` to its API. The database and APIs are not published directly to host ports.

Verify both frontends and API proxy paths:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
Invoke-RestMethod http://localhost:3001/api/health
```

For a login smoke test without printing the bootstrap password or returned tokens:

```powershell
$password = Get-Content .secrets/bootstrap_admin_password -Raw
$body = @{ email = 'admin@example.com'; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/login -ContentType 'application/json' -Body $body
if (-not $login.success -or -not $login.token) { throw 'Main application login smoke test failed.' }
Remove-Variable password, body, login
```

Use the email configured as `BOOTSTRAP_ADMIN_EMAIL` in `.env`. Do not use the example email unchanged.

Stop containers while retaining persistent data with `docker compose down`. **Do not use `docker compose down --volumes` unless intentionally deleting the database and RBAC data.**

## Cloud deployment

`aws/deploy_infrastructure.ps1` provisions an automatically-rotating AWS KMS key, KMS-encrypted S3 bucket, and SNS topic; it does not deploy this Compose application, configure IAM permissions, or create SNS subscriptions. Do not treat successful completion of that script as an application deployment. A cloud compute target, networking, TLS, managed secret delivery, database backup/recovery, SNS subscriptions, and deployment/update strategy still need to be chosen and configured before public production use.
