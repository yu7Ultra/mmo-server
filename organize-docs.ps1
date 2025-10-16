# Documentation Organization Script

# This script helps organize and identify duplicate documentation files

param(
    [string]$Action = "scan",
    [string]$Path = "."
)

function Get-DocumentationFiles {
    Get-ChildItem -Path $Path -Recurse -Include "*.md" | Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\build\\" -and
        $_.FullName -notmatch "\\dist\\"
    }
}

function Get-FileHash {
    param([string]$FilePath)
    $hash = Get-FileHash -Path $FilePath -Algorithm MD5
    return $hash.Hash
}

function Scan-Duplicates {
    Write-Host "Scanning for duplicate documentation files..." -ForegroundColor Green

    $docs = Get-DocumentationFiles
    $fileHashes = @{}
    $duplicates = @()

    foreach ($doc in $docs) {
        $hash = Get-FileHash $doc.FullName
        $relativePath = $doc.FullName.Replace((Get-Location).Path + "\", "")

        if ($fileHashes.ContainsKey($hash)) {
            $duplicates += @{
                File1 = $fileHashes[$hash]
                File2 = $relativePath
                Hash = $hash
            }
        } else {
            $fileHashes[$hash] = $relativePath
        }
    }

    if ($duplicates.Count -eq 0) {
        Write-Host "No duplicate files found." -ForegroundColor Green
    } else {
        Write-Host "Found $($duplicates.Count) duplicate pairs:" -ForegroundColor Yellow
        foreach ($dup in $duplicates) {
            Write-Host "Duplicate files:" -ForegroundColor Red
            Write-Host "  1. $($dup.File1)" -ForegroundColor White
            Write-Host "  2. $($dup.File2)" -ForegroundColor White
            Write-Host "  Hash: $($dup.Hash)" -ForegroundColor Gray
            Write-Host ""
        }
    }
}

function Scan-SimilarNames {
    Write-Host "Scanning for files with similar names..." -ForegroundColor Green

    $docs = Get-DocumentationFiles
    $nameGroups = @{}

    foreach ($doc in $docs) {
        $fileName = $doc.Name
        $relativePath = $doc.FullName.Replace((Get-Location).Path + "\", "")

        if ($nameGroups.ContainsKey($fileName)) {
            $nameGroups[$fileName] += $relativePath
        } else {
            $nameGroups[$fileName] = @($relativePath)
        }
    }

    $similarFound = $false
    foreach ($name in $nameGroups.Keys) {
        if ($nameGroups[$name].Count -gt 1) {
            $similarFound = $true
            Write-Host "Files with same name '$name':" -ForegroundColor Yellow
            foreach ($path in $nameGroups[$name]) {
                Write-Host "  - $path" -ForegroundColor White
            }
            Write-Host ""
        }
    }

    if (-not $similarFound) {
        Write-Host "No files with similar names found." -ForegroundColor Green
    }
}

function Check-TranslationConsistency {
    Write-Host "Checking translation consistency between en/ and zh/ directories..." -ForegroundColor Green
    
    $enPath = Join-Path $PSScriptRoot "documents\en"
    $zhPath = Join-Path $PSScriptRoot "documents\zh"
    
    if (!(Test-Path $enPath) -or !(Test-Path $zhPath)) {
        Write-Host "Error: documents/en/ or documents/zh/ directory not found." -ForegroundColor Red
        return
    }
    
    $enFiles = Get-ChildItem -Path $enPath -Filter "*.md" | Select-Object -ExpandProperty Name
    $zhFiles = Get-ChildItem -Path $zhPath -Filter "*.md" | Select-Object -ExpandProperty Name
    
    # Handle special case: MINIPLEX_DOCS.md (en) vs MINIPLEX_DOCS_CN.md (zh)
    $zhFilesNormalized = $zhFiles | ForEach-Object {
        if ($_ -eq "MINIPLEX_DOCS_CN.md") { "MINIPLEX_DOCS.md" } else { $_ }
    }
    
    $missingInZh = $enFiles | Where-Object { $_ -notin $zhFilesNormalized }
    $extraInZh = $zhFilesNormalized | Where-Object { $_ -notin $enFiles }
    
    Write-Host "Translation Status:" -ForegroundColor Cyan
    Write-Host "  English files: $($enFiles.Count)" -ForegroundColor White
    Write-Host "  Chinese files: $($zhFiles.Count)" -ForegroundColor White
    Write-Host "  Completion rate: $([math]::Round(($zhFiles.Count / $enFiles.Count) * 100, 1))%" -ForegroundColor White
    
    if ($missingInZh.Count -gt 0) {
        Write-Host "`nMissing Chinese translations ($($missingInZh.Count) files):" -ForegroundColor Yellow
        foreach ($file in $missingInZh) {
            Write-Host "  - $file" -ForegroundColor White
        }
    }
    
    if ($extraInZh.Count -gt 0) {
        Write-Host "`nExtra files in Chinese directory ($($extraInZh.Count) files):" -ForegroundColor Yellow
        foreach ($file in $extraInZh) {
            Write-Host "  - $file" -ForegroundColor White
        }
    }
    
    if ($missingInZh.Count -eq 0 -and $extraInZh.Count -eq 0) {
        Write-Host "`n✅ All documents have matching translations!" -ForegroundColor Green
    }
}

switch ($Action) {
    "scan" {
        Scan-Duplicates
        Write-Host ""
        Scan-SimilarNames
    }
    "duplicates" {
        Scan-Duplicates
    }
    "similar" {
        Scan-SimilarNames
    }
    "index" {
        Generate-Index
    }
    "consistency" {
        Check-TranslationConsistency
    }
    default {
        Write-Host "Usage: .\organize-docs.ps1 -Action <scan|duplicates|similar|index|consistency> [-Path <path>]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Actions:" -ForegroundColor Cyan
        Write-Host "  scan      - Scan for duplicates and similar names"
        Write-Host "  duplicates - Scan for duplicate files only"
        Write-Host "  similar   - Scan for similar names only"
        Write-Host "  index     - Generate documentation index"
        Write-Host "  consistency - Check translation consistency between en/ and zh/"
    }
}