<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Extract ZIP on server</title>
    <style>
        body { max-width: 42rem; margin: 3rem auto; padding: 0 1rem; font: 16px/1.5 system-ui, sans-serif; color: #1f2937; }
        main { border: 1px solid #d1d5db; border-radius: .75rem; padding: 1.5rem; }
        button { padding: .65rem 1rem; cursor: pointer; }
        .error { color: #b91c1c; }
        .success { color: #166534; overflow-wrap: anywhere; }
    </style>
</head>
<body>
<main>
    <h1>Extract ZIP on server</h1>
    <p>Upload a ZIP archive. The server will extract it into a new private folder under <code>backend/storage/app/private/extracted</code>.</p>

    @if ($errors->any())
        <p class="error" role="alert">{{ $errors->first('archive') }}</p>
    @endif

    @if (session('extraction'))
        <p class="success" role="status">
            Extracted {{ session('extraction.files') }} files to:<br>
            <code>{{ session('extraction.directory') }}</code>
        </p>
    @endif

    <form method="post" action="{{ route('server-unzip.store') }}" enctype="multipart/form-data">
        @csrf
        <p><label for="archive">ZIP file (maximum 100 MB)</label></p>
        <p><input id="archive" name="archive" type="file" accept=".zip,application/zip" required></p>
        <button type="submit">Upload and extract</button>
    </form>
</main>
</body>
</html>
