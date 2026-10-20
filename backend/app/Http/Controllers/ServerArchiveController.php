<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class ServerArchiveController extends Controller
{
    private const MAX_ARCHIVE_BYTES = 104857600;
    private const MAX_EXTRACTED_BYTES = 524288000;
    private const MAX_ENTRIES = 10000;

    public function index()
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403);

        return view('server-archive');
    }

    public function store(Request $request)
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403);

        $request->validate([
            'archive' => ['required', 'file', 'mimes:zip', 'max:102400'],
        ]);

        if (! class_exists(ZipArchive::class)) {
            return back()->withErrors(['archive' => 'ZIP extraction is unavailable because the PHP Zip extension is not installed.']);
        }

        $zip = new ZipArchive();
        $opened = $zip->open($request->file('archive')->getRealPath());
        if ($opened !== true) {
            return back()->withErrors(['archive' => 'The uploaded file is not a readable ZIP archive.']);
        }

        $destination = 'extracted/'.now()->format('Ymd-His').'-'.Str::lower(Str::random(8));
        $disk = Storage::disk('local');
        $totalBytes = 0;
        $fileCount = 0;

        try {
            if ($zip->numFiles > self::MAX_ENTRIES) {
                throw new \RuntimeException('The archive contains too many entries.');
            }

            for ($index = 0; $index < $zip->numFiles; $index++) {
                $entry = $zip->statIndex($index);
                if (! $entry) {
                    throw new \RuntimeException('The archive contains an unreadable entry.');
                }

                $name = str_replace('\\', '/', $entry['name']);
                $parts = explode('/', $name);
                if ($name === '' || str_starts_with($name, '/') || preg_match('/^[A-Za-z]:/', $name)
                    || in_array('..', $parts, true) || str_contains($name, "\0")) {
                    throw new \RuntimeException('The archive contains an unsafe file path.');
                }

                $relative = trim($name, '/');
                if ($relative === '') {
                    continue;
                }
                $target = $destination.'/'.$relative;

                if (str_ends_with($name, '/')) {
                    $disk->makeDirectory($target);
                    continue;
                }

                $stream = $zip->getStream($entry['name']);
                if ($stream === false) {
                    throw new \RuntimeException('A file in the archive could not be read.');
                }

                $disk->makeDirectory(dirname($target));
                $output = fopen($disk->path($target), 'xb');
                if ($output === false) {
                    fclose($stream);
                    throw new \RuntimeException('The server could not create an extracted file.');
                }

                try {
                    while (! feof($stream)) {
                        $chunk = fread($stream, 65536);
                        if ($chunk === false) {
                            throw new \RuntimeException('A file in the archive could not be read.');
                        }
                        if ($chunk === '') {
                            continue;
                        }

                        $totalBytes += strlen($chunk);
                        if ($totalBytes > self::MAX_EXTRACTED_BYTES) {
                            throw new \RuntimeException('The extracted archive would exceed the 500 MB limit.');
                        }

                        $offset = 0;
                        while ($offset < strlen($chunk)) {
                            $written = fwrite($output, substr($chunk, $offset));
                            if ($written === false || $written === 0) {
                                throw new \RuntimeException('The server could not write an extracted file.');
                            }
                            $offset += $written;
                        }
                    }
                } finally {
                    fclose($stream);
                    fclose($output);
                }

                $fileCount++;
            }
        } catch (\Throwable $exception) {
            $zip->close();
            $disk->deleteDirectory($destination);

            return back()->withErrors(['archive' => $exception->getMessage()]);
        }

        $zip->close();

        return back()->with('extraction', [
            'directory' => storage_path('app/private/'.$destination),
            'files' => $fileCount,
        ]);
    }
}
