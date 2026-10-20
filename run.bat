@echo off
title Huffman File Compressor & Visualizer
echo Starting local web server...
python server.py
if errorlevel 1 (
    echo Python not found in path, trying 'py'...
    py server.py
)
pause
