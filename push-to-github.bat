@echo off
title Push to GitHub
echo ==================================================
echo Pushing Huffman Compressor to GitHub...
echo Target: https://github.com/vaishnavigengaje13/huffman-compressor
echo ==================================================
git push -u origin main --force
if errorlevel 1 (
    echo.
    echo [ERROR] Push did not complete.
    echo Please make sure you sign into GitHub in the pop-up window if prompted.
) else (
    echo.
    echo ==================================================
    echo [SUCCESS] Your code is now live on GitHub!
    echo Visit: https://github.com/vaishnavigengaje13/huffman-compressor
    echo ==================================================
)
echo.
pause
