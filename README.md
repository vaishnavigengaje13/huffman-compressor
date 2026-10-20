# 🗜️ Huffman File Compressor & Interactive Tree Visualizer

An end-to-end, browser-based Data Structures and Algorithms (DSA) project implementing **Lossless Huffman Data Compression** with real binary bit-packing, interactive SVG tree exploration, and comprehensive metrics.

---

## 🌟 Key Features

1. **True Binary Compression & Decompression (`.huff`)**:
   - Not just string simulations—actually packs 8 bits into binary bytes (`Uint8Array`, `ArrayBuffer`).
   - Self-contained file format with custom magic bytes (`HUFF`), padding bit preservation, and serialized frequency header.
   - Decompress any `.huff` archive back into the exact original file with zero data loss.

2. **Interactive Huffman Tree Visualizer**:
   - Dynamic SVG hierarchical tree layout.
   - Displays branch bits: **Left = `0`**, **Right = `1`**.
   - **Click-to-Trace**: Click any character in the frequency table to trace and highlight its exact path from root to leaf!
   - Pan (drag with mouse) and smooth zoom controls.

3. **Real-Time Analytics & Information Theory**:
   - Original vs Compressed file size.
   - Compression ratio (% reduction).
   - Shannon Entropy calculation ($H(X)$) showing the theoretical minimum bits per symbol.
   - Live hexadecimal and binary bitstream previews.

4. **Built-in Viva & Interview Defense Guide**:
   - Embedded explanations, complexity breakdowns, and answers to common examiner questions directly in the web UI.

---

## 🧠 Core Data Structures & Algorithms (DSA)

| Data Structure / Algorithm | Role in this Project | Time Complexity |
| :--- | :--- | :--- |
| **Hash Map** | Tallies character frequencies from raw byte stream | $O(N)$ |
| **Min-Heap (Priority Queue)** | Always extracts the two lowest-frequency subtrees in $O(\log K)$ | $O(K \log K)$ |
| **Binary Tree** | Hierarchical prefix tree where leaf nodes store symbols and edges store bits | $O(K)$ |
| **Greedy Algorithm** | Repeatedly combines the two smallest frequency nodes to ensure optimal tree | $O(K \log K)$ |
| **Bitwise Operations** | Bit shifting (`<<`, `>>`), bitwise OR (`\|`), bit masking (`&`) to pack bits into 8-bit bytes | $O(N)$ |

*Where $N$ is total number of characters, and $K$ is the number of unique characters ($K \le 256$ for byte streams).*

---

## 📁 Project Structure

```text
huffman-compressor/
├── index.html              # Responsive Single-Page Application
├── css/
│   └── styles.css          # Developer-focused dark UI with CSS variables & responsive layout
├── js/
│   ├── app.js              # Full standalone controller (MinHeap, HuffmanCodec, Visualizer, UI)
│   ├── minheap.js          # Modular Min-Heap implementation (ES6 module)
│   ├── huffman.js          # Modular Huffman Codec & bitstream serializer (ES6 module)
│   └── treeVisualizer.js   # Modular SVG Tree Visualizer (ES6 module)
├── test_huffman.py         # Automated Python test suite for algorithm verification
├── server.py               # Local Python HTTP server (auto-opens browser)
├── run.bat                 # 1-click Windows launcher
└── README.md               # Project documentation & presentation guide
```

---

## 🚀 How to Run the Website

### Option 1: Direct File Open (Zero Install)
Simply double-click `index.html` or open it directly in any web browser (Chrome, Edge, Firefox, Brave, Safari). It works completely offline with zero installation.

### Option 2: 1-Click Windows Launcher
Double-click `run.bat`. It will start a local server and automatically open the application in your browser at `http://localhost:8000`.

### Option 3: Python Command Line
Open a terminal in this directory and run:
```bash
python server.py
```
Or:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

---

## 🎤 How to Explain This Project in an Interview or Viva

### The 30-Second Elevator Pitch
> *"In standard UTF-8 or ASCII encoding, every character takes a fixed 8 bits, whether it appears once or a million times. This website uses Huffman Coding—a greedy algorithm powered by a Min-Heap—to assign shorter variable-length binary codes to frequent characters and longer codes to rare ones. It packs these bits into true binary bytes, generates downloadable `.huff` archives, and provides an interactive visualizer to inspect the resulting prefix tree."*

### Top 3 Questions Interviewers Will Ask:

1. **Why do we need a Min-Heap instead of sorting an array?**
   - *Answer:* When we merge the two smallest nodes, their sum needs to be re-inserted. With a sorted array, re-inserting takes $O(K)$ time per merge ($O(K^2)$ overall). A Min-Heap performs insertion and extraction in $O(\log K)$, giving an optimal $O(K \log K)$ runtime.

2. **Why is Huffman coding guaranteed to be prefix-free?**
   - *Answer:* All actual characters only exist as leaf nodes in the binary tree. Since a leaf node has no children, no character's path can ever be a prefix of another character's path.

3. **How does the decompressor know when the file ends?**
   - *Answer:* Bytes must be 8-bit aligned. If an encoded stream is 37 bits, it takes 5 bytes (40 bits), leaving 3 padding bits in the final byte. Our file format includes a 1-byte header field specifying the padding bit count so the decompressor ignores those trailing bits.
