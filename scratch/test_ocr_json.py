import time
import json
import subprocess
from pathlib import Path

def extract_detailed_ocr(image_path: str):
    t0 = time.time()
    abs_path = str(Path(image_path).resolve())
    ps_script = f'''
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null

function Await($asyncOp, $type) {{
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? {{ $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }}[0]
    $asTask = $asTaskGeneric.MakeGenericMethod($type)
    $netTask = $asTask.Invoke($null, @($asyncOp))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}}

try {{
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync('{abs_path}')
    $storageFile = Await $fileOp ([Windows.Storage.StorageFile])
    $streamOp = $storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await $streamOp ([Windows.Storage.Streams.IRandomAccessStream])
    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])
    $bmpOp = $decoder.GetSoftwareBitmapAsync()
    $softwareBmp = Await $bmpOp ([Windows.Graphics.Imaging.SoftwareBitmap])
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $engine) {{
        $langs = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
        if ($langs.Count -gt 0) {{ $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($langs[0]) }}
    }}
    if ($null -ne $engine) {{
        $ocrOp = $engine.RecognizeAsync($softwareBmp)
        $ocrResult = Await $ocrOp ([Windows.Media.Ocr.OcrResult])
        
        $lines = @()
        foreach ($line in $ocrResult.Lines) {{
            $words = @()
            $minX = 999999; $minY = 999999; $maxX = 0; $maxY = 0;
            foreach ($w in $line.Words) {{
                $r = $w.BoundingRect
                if ($r.X -lt $minX) {{ $minX = $r.X }}
                if ($r.Y -lt $minY) {{ $minY = $r.Y }}
                if (($r.X + $r.Width) -gt $maxX) {{ $maxX = $r.X + $r.Width }}
                if (($r.Y + $r.Height) -gt $maxY) {{ $maxY = $r.Y + $r.Height }}
                $words += @{{ text = $w.Text; x = [int]$r.X; y = [int]$r.Y; w = [int]$r.Width; h = [int]$r.Height }}
            }}
            $lines += @{{
                text = $line.Text
                bbox = @([int]$minX, [int]$minY, [int]($maxX - $minX), [int]($maxY - $minY))
                words = $words
            }}
        }}
        $res = @{{
            text = $ocrResult.Text
            lines = $lines
        }}
        Write-Output ($res | ConvertTo-Json -Depth 5 -Compress)
    }} else {{
        Write-Output '{{}}'
    }}
}} catch {{
    Write-Output '{{}}'
}}
'''
    res = subprocess.run(
        ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps_script],
        capture_output=True,
        text=True,
        timeout=15
    )
    raw = res.stdout.strip()
    data = json.loads(raw) if raw.startswith('{') else {"text": "", "lines": []}
    data["elapsed"] = time.time() - t0
    return data

d = extract_detailed_ocr('backend/uploads/images/content_org_19_1794714097_66.jpeg')
print("Elapsed:", d.get("elapsed"))
print("Lines count:", len(d.get("lines", [])))
print("Text length:", len(d.get("text", "")))
for line in d.get("lines", [])[:3]:
    print("Line:", line["text"], "bbox:", line["bbox"])
