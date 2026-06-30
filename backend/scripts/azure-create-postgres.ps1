# Nurse Care — Azure PostgreSQL Flexible Server (optional CLI setup)
#
# Prerequisites: Azure CLI (`az login`)
#
# Usage:
#   .\scripts\azure-create-postgres.ps1 `
#     -ResourceGroup "nursecare-rg" `
#     -Location "centralindia" `
#     -ServerName "nursecare-db" `
#     -AdminUser "nursecareadmin" `
#     -AdminPassword "YourStrongP@ssw0rd!" `
#     -DatabaseName "nurse_care"

param(
  [Parameter(Mandatory = $true)][string]$ResourceGroup,
  [Parameter(Mandatory = $true)][string]$Location,
  [Parameter(Mandatory = $true)][string]$ServerName,
  [Parameter(Mandatory = $true)][string]$AdminUser,
  [Parameter(Mandatory = $true)][string]$AdminPassword,
  [string]$DatabaseName = "nurse_care",
  [string]$SkuName = "Standard_B1ms",
  [int]$StorageSizeGB = 32,
  [string]$PostgresVersion = "16"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Azure PostgreSQL setup ===`n"

az group create --name $ResourceGroup --location $Location | Out-Null

Write-Host "Creating flexible server '$ServerName' (this may take several minutes)…"
az postgres flexible-server create `
  --resource-group $ResourceGroup `
  --name $ServerName `
  --location $Location `
  --admin-user $AdminUser `
  --admin-password $AdminPassword `
  --sku-name $SkuName `
  --storage-size $StorageSizeGB `
  --version $PostgresVersion `
  --public-access 0.0.0.0 `
  --yes

Write-Host "Creating database '$DatabaseName'…"
az postgres flexible-server db create `
  --resource-group $ResourceGroup `
  --server-name $ServerName `
  --database-name $DatabaseName

$encodedPassword = [uri]::EscapeDataString($AdminPassword)
$connectionString = "postgresql://${AdminUser}@${ServerName}:${encodedPassword}@${ServerName}.postgres.database.azure.com:5432/${DatabaseName}?sslmode=require"

Write-Host "`n✔ Azure PostgreSQL ready.`n"
Write-Host "DATABASE_URL (store in Key Vault / .env — do not commit):"
Write-Host $connectionString
Write-Host "`nNext steps:"
Write-Host "  1. Add your IP in Azure Portal → Networking → Firewall rules"
Write-Host "  2. Set DATABASE_URL in backend/.env or root .env for Docker"
Write-Host "  3. cd backend && npm run db:init -- --seed`n"
