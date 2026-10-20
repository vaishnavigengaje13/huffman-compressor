"""
Simple local development server for Huffman Compressor
Automatically opens the application in your default browser.
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"==================================================")
        print(f"🗜️  Huffman Compressor & Visualizer Running!")
        print(f"👉 Serving at: {url}")
        print(f"👉 Press Ctrl+C in this window to stop the server.")
        print(f"==================================================")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")
            sys.exit(0)

if __name__ == "__main__":
    run()
