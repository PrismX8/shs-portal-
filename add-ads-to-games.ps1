$adCode = @"
<!-- Display Ad -->
<div style="max-width: 100%; margin: 20px auto; text-align: center; padding: 0 20px;">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3290829368025891"
     crossorigin="anonymous"></script>
<!-- display ads -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-3290829368025891"
     data-ad-slot="9717787503"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
</div>
"@

$gamesPath = "games"
$files = Get-ChildItem -Path $gamesPath -Filter "game-*.html"

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if ad code already exists
    if ($content -notmatch 'data-ad-slot="9717787503"') {
        # Replace </body> with ad code + </body>
        $content = $content -replace '</body>', "$adCode`n</body>"
        Set-Content $file.FullName -Value $content -NoNewline
        $count++
        if ($count % 100 -eq 0) {
            Write-Host "Processed $count files..."
        }
    }
}

Write-Host "Completed! Updated $count game files."

