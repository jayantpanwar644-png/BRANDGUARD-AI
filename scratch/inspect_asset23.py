import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image
import numpy as np

im23 = Image.open('backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png')
print("im23 mode:", im23.mode, "size:", im23.size)

# Find non-transparent or non-black/white pixels
arr23 = np.array(im23)
print("arr23 shape:", arr23.shape)
print("arr23 alpha unique:", np.unique(arr23[:, :, 3]))

# Let's inspect where content is located
rgb23 = arr23[:, :, :3]
corner = rgb23[0, 0]
print("corner color:", corner)
diff = np.sqrt(np.sum((rgb23.astype(float) - corner.astype(float))**2, axis=2))
active = diff > 20
ys, xs = np.where(active)
print("Active bbox in im23:", xs.min(), ys.min(), xs.max(), ys.max())

# Let's inspect OCR on im23 with word positions
import subprocess

ps_script = '''
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null

function Await($asyncOp, $type) {
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }[0]
    $asTask = $asTaskGeneric.MakeGenericMethod($type)
    $netTask = $asTask.Invoke($null, @($asyncOp))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

$absPath = (Resolve-Path 'backend/uploads/logos/rasters/raster_19_1794708568_WhatsApp_Image_2026-11-15_at_12.38.52_AM.png').Path
$fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($absPath)
$storageFile = Await $fileOp ([Windows.Storage.StorageFile])
$streamOp = $storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)
$stream = Await $streamOp ([Windows.Storage.Streams.IRandomAccessStream])
$decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
$decoder = Await $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmapOp = $decoder.GetSoftwareBitmapAsync()
$bitmap = Await $bitmapOp ([Windows.Graphics.Imaging.SoftwareBitmap])

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$resultOp = $engine.RecognizeAsync($bitmap)
$result = Await $resultOp ([Windows.Media.Ocr.OcrResult])

foreach ($line in $result.Lines) {
    Write-Host "LINE: $($line.Text)"
    foreach ($word in $line.Words) {
        $r = $word.BoundingRect
        Write-Host "  WORD: $($word.Text) at x=$($r.X), y=$($r.Y), w=$($r.Width), h=$($r.Height)"
    }
}
'''

res = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script], capture_output=True, text=True)
print(res.stdout)
