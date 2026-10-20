/**
 * ====================================================================
 * HUFFMAN COMPRESSOR & TREE VISUALIZER
 * Complete Data Structures & Algorithms Implementation
 * ====================================================================
 * 1. MinHeap (Priority Queue)
 * 2. HuffmanCodec (Tree Building, True Binary Bit-Packing/Unpacking)
 * 3. TreeVisualizer (Interactive SVG Layout with Zoom & Pan)
 * 4. App Controller (UI Events, File I/O, Statistics)
 * ====================================================================
 */

// ==========================================
// 1. MIN-HEAP (PRIORITY QUEUE)
// ==========================================
class MinHeap {
  constructor(comparator = (a, b) => a.freq - b.freq) {
    this.heap = [];
    this.comparator = comparator;
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._siftDown(0);
    return root;
  }

  _siftUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.comparator(this.heap[index], this.heap[parentIdx]) < 0) {
        [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  _siftDown(index) {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.comparator(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild;
      }

      if (rightChild < length && this.comparator(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }
}

// ==========================================
// 2. HUFFMAN NODE & CODEC
// ==========================================
class HuffmanNode {
  constructor(byte, freq, left = null, right = null, id = 0) {
    this.byte = byte;       // null for internal nodes, number (0-255) for leaves
    this.freq = freq;       // frequency count
    this.left = left;       // left child ('0' bit)
    this.right = right;     // right child ('1' bit)
    this.id = id;           // monotonic ID for deterministic tie-breaking
  }

  isLeaf() {
    return this.left === null && this.right === null;
  }
}

class HuffmanCodec {
  static MAGIC = [0x48, 0x55, 0x46, 0x46]; // "HUFF"

  static getFrequencyMap(uint8Data) {
    const freqMap = new Map();
    for (let i = 0; i < uint8Data.length; i++) {
      const byte = uint8Data[i];
      freqMap.set(byte, (freqMap.get(byte) || 0) + 1);
    }
    return freqMap;
  }

  static buildTree(freqMap) {
    if (freqMap.size === 0) return null;

    let idCounter = 256;
    const comparator = (a, b) => {
      if (a.freq !== b.freq) return a.freq - b.freq;
      return a.id - b.id;
    };

    const heap = new MinHeap(comparator);

    // Sort entries by byte ascending for deterministic initial order
    const sortedEntries = Array.from(freqMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [byte, freq] of sortedEntries) {
      heap.push(new HuffmanNode(byte, freq, null, null, byte));
    }

    // Edge case: Only one unique character
    if (heap.size() === 1) {
      const onlyNode = heap.pop();
      const root = new HuffmanNode(null, onlyNode.freq, onlyNode, null, idCounter++);
      return root;
    }

    // Repeatedly combine two lowest frequency nodes
    while (heap.size() > 1) {
      const left = heap.pop();
      const right = heap.pop();
      const parent = new HuffmanNode(
        null,
        left.freq + right.freq,
        left,
        right,
        idCounter++
      );
      heap.push(parent);
    }

    return heap.pop();
  }

  static generateCodes(root) {
    const codes = new Map();
    if (!root) return codes;

    function traverse(node, currentCode) {
      if (node.isLeaf()) {
        codes.set(node.byte, currentCode || '0');
        return;
      }
      if (node.left) traverse(node.left, currentCode + '0');
      if (node.right) traverse(node.right, currentCode + '1');
    }

    traverse(root, '');
    return codes;
  }

  static calculateEntropy(freqMap, totalBytes) {
    if (totalBytes === 0) return 0;
    let entropy = 0;
    for (const freq of freqMap.values()) {
      const p = freq / totalBytes;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  static compress(inputBytes) {
    if (inputBytes.length === 0) {
      throw new Error("Input data is empty. Nothing to compress.");
    }

    const freqMap = this.getFrequencyMap(inputBytes);
    const root = this.buildTree(freqMap);
    const codes = this.generateCodes(root);

    let totalBits = 0;
    for (let i = 0; i < inputBytes.length; i++) {
      totalBits += codes.get(inputBytes[i]).length;
    }

    const paddingBits = (8 - (totalBits % 8)) % 8;
    const totalDataBytes = Math.ceil(totalBits / 8);

    const symbolCount = freqMap.size;
    const headerSize = 4 + 1 + 2 + (symbolCount * 5);
    const totalOutputSize = headerSize + totalDataBytes;

    const outputBuffer = new Uint8Array(totalOutputSize);
    const dataView = new DataView(outputBuffer.buffer);

    // 1. Magic bytes "HUFF"
    for (let i = 0; i < 4; i++) {
      outputBuffer[i] = this.MAGIC[i];
    }

    // 2. Padding bits count (0..7)
    outputBuffer[4] = paddingBits;

    // 3. Unique symbol count (Uint16)
    dataView.setUint16(5, symbolCount, false);

    // 4. Frequency table
    let offset = 7;
    const sortedEntries = Array.from(freqMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [byte, freq] of sortedEntries) {
      outputBuffer[offset] = byte;
      dataView.setUint32(offset + 1, freq, false);
      offset += 5;
    }

    // 5. Pack bitstream
    let currentByte = 0;
    let bitPosition = 7;

    for (let i = 0; i < inputBytes.length; i++) {
      const code = codes.get(inputBytes[i]);
      for (let j = 0; j < code.length; j++) {
        if (code[j] === '1') {
          currentByte |= (1 << bitPosition);
        }
        bitPosition--;
        if (bitPosition < 0) {
          outputBuffer[offset++] = currentByte;
          currentByte = 0;
          bitPosition = 7;
        }
      }
    }

    if (bitPosition !== 7) {
      outputBuffer[offset++] = currentByte;
    }

    return {
      compressedBytes: outputBuffer,
      freqMap,
      codes,
      root,
      totalBits,
      paddingBits,
      originalSize: inputBytes.length,
      compressedSize: outputBuffer.length,
      compressionRatio: ((1 - (outputBuffer.length / inputBytes.length)) * 100).toFixed(2),
      entropy: this.calculateEntropy(freqMap, inputBytes.length).toFixed(3)
    };
  }

  static decompress(compressedBytes) {
    if (compressedBytes.length < 7) {
      throw new Error("File is too small to be a valid Huffman archive.");
    }

    // 1. Verify Magic
    for (let i = 0; i < 4; i++) {
      if (compressedBytes[i] !== this.MAGIC[i]) {
        throw new Error("Invalid file header: Not a valid .huff compressed file.");
      }
    }

    const paddingBits = compressedBytes[4];
    const dataView = new DataView(compressedBytes.buffer, compressedBytes.byteOffset, compressedBytes.byteLength);
    const symbolCount = dataView.getUint16(5, false);

    const expectedHeaderSize = 7 + (symbolCount * 5);
    if (compressedBytes.length < expectedHeaderSize) {
      throw new Error("Corrupted file header: Incomplete frequency table.");
    }

    // 2. Read Frequency Map
    const freqMap = new Map();
    let totalOriginalBytes = 0;
    let offset = 7;
    for (let i = 0; i < symbolCount; i++) {
      const byte = compressedBytes[offset];
      const freq = dataView.getUint32(offset + 1, false);
      freqMap.set(byte, freq);
      totalOriginalBytes += freq;
      offset += 5;
    }

    // 3. Rebuild Tree
    const root = this.buildTree(freqMap);
    if (!root) {
      return new Uint8Array(0);
    }

    // 4. Decode Bitstream
    const result = new Uint8Array(totalOriginalBytes);
    let resultIdx = 0;

    let currentNode = root;
    const totalDataBytes = compressedBytes.length - offset;

    for (let i = 0; i < totalDataBytes; i++) {
      const byte = compressedBytes[offset + i];
      const isLastByte = (i === totalDataBytes - 1);
      const limitBits = isLastByte ? paddingBits : 0;

      for (let bit = 7; bit >= limitBits; bit--) {
        const isSet = (byte & (1 << bit)) !== 0;

        currentNode = isSet ? currentNode.right : currentNode.left;

        if (!currentNode) {
          throw new Error("Decoding error: Invalid path in Huffman tree.");
        }

        if (currentNode.isLeaf()) {
          result[resultIdx++] = currentNode.byte;
          currentNode = root;

          if (resultIdx === totalOriginalBytes) {
            break;
          }
        }
      }

      if (resultIdx === totalOriginalBytes) break;
    }

    return {
      decompressedBytes: result,
      freqMap,
      root,
      totalBytes: totalOriginalBytes
    };
  }
}

// ==========================================
// 3. TREE VISUALIZER (SVG Canvas)
// ==========================================
class TreeVisualizer {
  constructor(containerElement) {
    this.container = containerElement;
    this.root = null;
    this.codes = null;
    this.svg = null;
    this.g = null;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.highlightedByte = null;

    this._initContainer();
  }

  _initContainer() {
    this.container.innerHTML = `
      <div class="tree-controls">
        <button id="btnZoomIn" class="btn-ctrl" title="Zoom In">➕</button>
        <button id="btnZoomOut" class="btn-ctrl" title="Zoom Out">➖</button>
        <button id="btnZoomReset" class="btn-ctrl" title="Reset View">🔄</button>
        <span class="tree-hint">💡 Drag to Pan | Scroll to Zoom | Click a letter row to trace tree path</span>
      </div>
      <div class="svg-wrapper" id="svgWrapper">
        <svg id="treeSvg" width="100%" height="520"></svg>
      </div>
    `;

    this.svg = this.container.querySelector('#treeSvg');
    const wrapper = this.container.querySelector('#svgWrapper');

    this.container.querySelector('#btnZoomIn').addEventListener('click', () => this.zoom(1.2));
    this.container.querySelector('#btnZoomOut').addEventListener('click', () => this.zoom(0.8));
    this.container.querySelector('#btnZoomReset').addEventListener('click', () => this.resetView());

    wrapper.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this._updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      wrapper.style.cursor = 'grab';
    });

    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoom(zoomFactor, e.offsetX, e.offsetY);
    }, { passive: false });
  }

  static formatChar(byte) {
    if (byte === null || byte === undefined) return '';
    if (byte === 32) return '␣ [space]';
    if (byte === 10) return '\\n [newline]';
    if (byte === 13) return '\\r';
    if (byte === 9) return '\\t [tab]';
    if (byte >= 33 && byte <= 126) return String.fromCharCode(byte);
    return `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  render(root, codes = new Map(), highlightByte = null) {
    this.root = root;
    this.codes = codes;
    this.highlightedByte = highlightByte;

    this.svg.innerHTML = '';
    if (!root) {
      this.svg.innerHTML = `
        <text x="50%" y="50%" text-anchor="middle" fill="#8892b0" font-size="16">
          No tree available. Compress or decompress some text first.
        </text>
      `;
      return;
    }

    this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.g.setAttribute('id', 'treeGroup');
    this.svg.appendChild(this.g);

    const layout = this._computeLayout(root);
    this._renderEdges(layout);
    this._renderNodes(layout);
    this.fitView(layout);
  }

  _computeLayout(root) {
    let leafX = 0;
    const xSpacing = 58;
    const ySpacing = 85;

    function assignPositions(node, depth = 0) {
      if (!node) return null;

      const item = {
        node,
        depth,
        x: 0,
        y: depth * ySpacing + 40,
        left: null,
        right: null
      };

      if (node.isLeaf()) {
        item.x = leafX * xSpacing + 40;
        leafX++;
      } else {
        item.left = assignPositions(node.left, depth + 1);
        item.right = assignPositions(node.right, depth + 1);

        if (item.left && item.right) {
          item.x = (item.left.x + item.right.x) / 2;
        } else if (item.left) {
          item.x = item.left.x;
        } else if (item.right) {
          item.x = item.right.x;
        }
      }

      return item;
    }

    const rootLayout = assignPositions(root, 0);
    const nodes = [];
    const edges = [];

    function collect(item, pathBits = '') {
      if (!item) return;
      item.pathBits = pathBits;
      nodes.push(item);

      if (item.left) {
        edges.push({
          parent: item,
          child: item.left,
          bit: '0',
          pathBits: pathBits + '0'
        });
        collect(item.left, pathBits + '0');
      }

      if (item.right) {
        edges.push({
          parent: item,
          child: item.right,
          bit: '1',
          pathBits: pathBits + '1'
        });
        collect(item.right, pathBits + '1');
      }
    }

    collect(rootLayout, '');
    return { rootLayout, nodes, edges };
  }

  _renderEdges({ edges }) {
    const targetCode = this.highlightedByte !== null ? this.codes.get(this.highlightedByte) : null;

    edges.forEach(({ parent, child, bit, pathBits }) => {
      const isHighlighted = targetCode && targetCode.startsWith(pathBits);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', parent.x);
      line.setAttribute('y1', parent.y);
      line.setAttribute('x2', child.x);
      line.setAttribute('y2', child.y);
      line.setAttribute('stroke', isHighlighted ? '#10b981' : '#4b5563');
      line.setAttribute('stroke-width', isHighlighted ? '3.5' : '1.8');
      line.setAttribute('stroke-linecap', 'round');
      this.g.appendChild(line);

      const midX = (parent.x + child.x) / 2;
      const midY = (parent.y + child.y) / 2;

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', midX);
      bg.setAttribute('cy', midY);
      bg.setAttribute('r', '10');
      bg.setAttribute('fill', isHighlighted ? '#10b981' : '#1f2937');
      bg.setAttribute('stroke', isHighlighted ? '#ffffff' : '#374151');
      bg.setAttribute('stroke-width', '1.5');
      this.g.appendChild(bg);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', midY + 3.5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', isHighlighted ? '#ffffff' : '#93c5fd');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', 'bold');
      text.textContent = bit;
      this.g.appendChild(text);
    });
  }

  _renderNodes({ nodes }) {
    const targetCode = this.highlightedByte !== null ? this.codes.get(this.highlightedByte) : null;

    nodes.forEach((item) => {
      const { node, x, y, pathBits } = item;
      const isLeaf = node.isLeaf();
      const isTargetLeaf = isLeaf && node.byte === this.highlightedByte;
      const isAncestor = targetCode && targetCode.startsWith(pathBits);

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'tree-node');
      group.style.cursor = isLeaf ? 'pointer' : 'default';

      const radius = isLeaf ? 22 : 18;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', radius);

      if (isTargetLeaf) {
        circle.setAttribute('fill', '#10b981');
        circle.setAttribute('stroke', '#ecfdf5');
        circle.setAttribute('stroke-width', '3');
      } else if (isAncestor) {
        circle.setAttribute('fill', '#047857');
        circle.setAttribute('stroke', '#6ee7b7');
        circle.setAttribute('stroke-width', '2.5');
      } else if (isLeaf) {
        circle.setAttribute('fill', '#2563eb');
        circle.setAttribute('stroke', '#93c5fd');
        circle.setAttribute('stroke-width', '2');
      } else {
        circle.setAttribute('fill', '#1f2937');
        circle.setAttribute('stroke', '#64748b');
        circle.setAttribute('stroke-width', '2');
      }
      group.appendChild(circle);

      const freqText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      freqText.setAttribute('x', x);
      freqText.setAttribute('y', isLeaf ? y - 2 : y + 4.5);
      freqText.setAttribute('text-anchor', 'middle');
      freqText.setAttribute('fill', '#ffffff');
      freqText.setAttribute('font-size', isLeaf ? '11' : '12');
      freqText.setAttribute('font-weight', 'bold');
      freqText.textContent = node.freq;
      group.appendChild(freqText);

      if (isLeaf) {
        const charLabel = TreeVisualizer.formatChar(node.byte);
        const leafCode = this.codes ? this.codes.get(node.byte) : '';

        const charText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        charText.setAttribute('x', x);
        charText.setAttribute('y', y + 36);
        charText.setAttribute('text-anchor', 'middle');
        charText.setAttribute('fill', isTargetLeaf ? '#34d399' : '#f3f4f6');
        charText.setAttribute('font-size', '12');
        charText.setAttribute('font-weight', '600');
        charText.textContent = charLabel;
        group.appendChild(charText);

        const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        codeText.setAttribute('x', x);
        codeText.setAttribute('y', y + 50);
        codeText.setAttribute('text-anchor', 'middle');
        codeText.setAttribute('fill', '#9ca3af');
        codeText.setAttribute('font-family', 'monospace');
        codeText.setAttribute('font-size', '10');
        codeText.textContent = `[${leafCode}]`;
        group.appendChild(codeText);

        group.addEventListener('click', () => {
          this.highlight(node.byte);
        });

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Symbol: ${charLabel}\nFrequency: ${node.freq}\nHuffman Code: ${leafCode}\nBit Length: ${leafCode.length}`;
        group.appendChild(title);
      } else {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Internal Node\nCombined Frequency: ${node.freq}`;
        group.appendChild(title);
      }

      this.g.appendChild(group);
    });
  }

  highlight(byte) {
    if (this.highlightedByte === byte) {
      this.highlightedByte = null;
    } else {
      this.highlightedByte = byte;
    }
    this.render(this.root, this.codes, this.highlightedByte);

    document.querySelectorAll('.freq-row').forEach(row => {
      if (parseInt(row.dataset.byte, 10) === this.highlightedByte) {
        row.classList.add('highlight-row');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        row.classList.remove('highlight-row');
      }
    });
  }

  fitView(layout) {
    if (!layout || !layout.nodes || layout.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    layout.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 50;
    const treeWidth = (maxX - minX) + padding * 2;
    const treeHeight = (maxY - minY) + padding * 2;

    const svgWidth = this.svg.clientWidth || 800;
    const svgHeight = this.svg.clientHeight || 520;

    const scaleX = svgWidth / treeWidth;
    const scaleY = svgHeight / treeHeight;
    this.zoomLevel = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.2);

    this.panX = (svgWidth - (maxX + minX) * this.zoomLevel) / 2;
    this.panY = 20;

    this._updateTransform();
  }

  zoom(factor) {
    this.zoomLevel = Math.min(Math.max(this.zoomLevel * factor, 0.2), 3.0);
    this._updateTransform();
  }

  resetView() {
    if (this.root) {
      const layout = this._computeLayout(this.root);
      this.fitView(layout);
    } else {
      this.zoomLevel = 1;
      this.panX = 0;
      this.panY = 0;
      this._updateTransform();
    }
  }

  _updateTransform() {
    if (this.g) {
      this.g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoomLevel})`);
    }
  }
}

// ==========================================
// 4. APP CONTROLLER
// ==========================================
let lastCompressionResult = null;
let lastDecompressionResult = null;
let currentCompressedBlob = null;
let currentDecompressedBlob = null;
let originalFileName = 'sample.txt';
let treeVisualizer = null;

const PRESETS = {
  shakespeare: `To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles
And by opposing end them. To die—to sleep,
No more; and by a sleep to say we end
The heart-ache and the thousand natural shocks
That flesh is heir to: 'tis a consummation
Devoutly to be wish'd.`,

  repetitive: `AAAAABBBBBBBCCCCCDDDDDDDDDDDEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFFFFFFFF
AAAAABBBBBBBCCCCCDDDDDDDDDDDEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFFFFFFFF
AAAAABBBBBBBCCCCCDDDDDDDDDDDEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFFFFFFFF`,

  pangram: `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!`,

  code: `function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}`
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCompressSection();
  initDecompressSection();
  initVisualizer();
  initPresets();

  // Load default preset on startup
  const textInput = document.getElementById('textInput');
  if (textInput) {
    textInput.value = PRESETS.shakespeare;
    executeCompression();
  }
});

function initTabs() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(targetTab);
      if (activePane) {
        activePane.classList.add('active');
      }

      if (targetTab === 'visualizerTab' && treeVisualizer && lastCompressionResult) {
        setTimeout(() => treeVisualizer.resetView(), 50);
      }
    });
  });
}

function initPresets() {
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      if (PRESETS[presetKey]) {
        document.getElementById('textInput').value = PRESETS[presetKey];
        originalFileName = `${presetKey}.txt`;
        executeCompression();
      }
    });
  });
}

function initVisualizer() {
  const container = document.getElementById('treeContainer');
  if (container) {
    treeVisualizer = new TreeVisualizer(container);
  }
}

function initCompressSection() {
  const compressBtn = document.getElementById('btnCompress');
  const fileInput = document.getElementById('compressFileInput');
  const dropZone = document.getElementById('compressDropZone');
  const downloadBtn = document.getElementById('btnDownloadCompressed');

  compressBtn.addEventListener('click', () => {
    executeCompression();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileInputForCompression(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileInputForCompression(e.target.files[0]);
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentCompressedBlob) return;
    const baseName = originalFileName.replace(/\.[^/.]+$/, "");
    downloadBlob(currentCompressedBlob, `${baseName}.huff`);
  });

  const tableSearch = document.getElementById('tableSearch');
  if (tableSearch) {
    tableSearch.addEventListener('input', (e) => {
      filterTable(e.target.value.toLowerCase());
    });
  }
}

function handleFileInputForCompression(file) {
  originalFileName = file.name;
  const reader = new FileReader();

  reader.onload = (e) => {
    const arrayBuffer = e.target.result;
    const uint8 = new Uint8Array(arrayBuffer);

    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(uint8);
      document.getElementById('textInput').value = text;
    } catch {
      document.getElementById('textInput').value = `[Binary file loaded: ${file.name} (${formatBytes(file.size)})]`;
    }

    executeCompressionWithBytes(uint8);
  };

  reader.readAsArrayBuffer(file);
}

function executeCompression() {
  const text = document.getElementById('textInput').value;
  if (!text) {
    alert("Please enter some text or upload a file to compress.");
    return;
  }
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(text);
  executeCompressionWithBytes(inputBytes);
}

function executeCompressionWithBytes(inputBytes) {
  try {
    const startTime = performance.now();
    const result = HuffmanCodec.compress(inputBytes);
    const elapsed = (performance.now() - startTime).toFixed(1);

    lastCompressionResult = result;
    currentCompressedBlob = new Blob([result.compressedBytes], { type: 'application/octet-stream' });

    document.getElementById('statOriginalSize').textContent = formatBytes(result.originalSize);
    document.getElementById('statCompressedSize').textContent = formatBytes(result.compressedSize);

    const ratioElem = document.getElementById('statRatio');
    const ratioVal = parseFloat(result.compressionRatio);
    ratioElem.textContent = `${result.compressionRatio}%`;
    ratioElem.className = `stat-value ${ratioVal >= 0 ? 'text-success' : 'text-danger'}`;

    document.getElementById('statEntropy').textContent = `${result.entropy} bits/sym`;
    document.getElementById('statUniqueChars').textContent = result.freqMap.size;
    document.getElementById('statPaddingBits').textContent = `${result.paddingBits} bits`;

    document.getElementById('btnDownloadCompressed').disabled = false;

    populateCodeTable(result.freqMap, result.codes, result.originalSize);

    if (treeVisualizer) {
      treeVisualizer.render(result.root, result.codes);
    }

    renderBitstreamPreview(result.compressedBytes, result.totalBits);

  } catch (err) {
    console.error(err);
    alert("Compression failed: " + err.message);
  }
}

function initDecompressSection() {
  const fileInput = document.getElementById('decompressFileInput');
  const dropZone = document.getElementById('decompressDropZone');
  const decompressBtn = document.getElementById('btnDecompress');
  const downloadBtn = document.getElementById('btnDownloadDecompressed');

  let selectedCompressedBytes = null;
  let decompressFileName = 'recovered.txt';

  function handleFile(file) {
    decompressFileName = file.name.replace(/\.huff$/, '') || 'recovered.txt';
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedCompressedBytes = new Uint8Array(e.target.result);
      document.getElementById('decompressFileInfo').innerHTML = `
        <div class="selected-file-badge">
          📁 <strong>${escapeHtml(file.name)}</strong> (${formatBytes(file.size)})
        </div>
      `;
      decompressBtn.disabled = false;
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  decompressBtn.addEventListener('click', () => {
    if (!selectedCompressedBytes) return;
    try {
      const startTime = performance.now();
      const result = HuffmanCodec.decompress(selectedCompressedBytes);
      const elapsed = (performance.now() - startTime).toFixed(1);

      lastDecompressionResult = result;
      currentDecompressedBlob = new Blob([result.decompressedBytes]);

      let previewText = '';
      try {
        previewText = new TextDecoder('utf-8', { fatal: true }).decode(result.decompressedBytes);
      } catch {
        previewText = `[Decompressed binary file: ${result.totalBytes} bytes. Download below to view.]`;
      }

      document.getElementById('decompressedOutput').value = previewText;

      const statsBox = document.getElementById('decompressStats');
      statsBox.style.display = 'block';
      statsBox.innerHTML = `
        ✅ <strong>Successfully Decompressed!</strong><br>
        • Reconstructed Size: <strong>${formatBytes(result.totalBytes)}</strong><br>
        • Unique Symbols Restored: <strong>${result.freqMap.size}</strong><br>
        • Decompression Time: <strong>${elapsed} ms</strong>
      `;

      downloadBtn.disabled = false;

    } catch (err) {
      console.error(err);
      alert("Decompression error: " + err.message);
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentDecompressedBlob) return;
    downloadBlob(currentDecompressedBlob, decompressFileName);
  });
}

function populateCodeTable(freqMap, codes, totalBytes) {
  const tbody = document.getElementById('codeTableBody');
  tbody.innerHTML = '';

  const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([byte, freq]) => {
    const code = codes.get(byte);
    const percentage = ((freq / totalBytes) * 100).toFixed(1);
    const charDisplay = TreeVisualizer.formatChar(byte);
    const bitsSaved = (freq * 8) - (freq * code.length);

    const tr = document.createElement('tr');
    tr.className = 'freq-row';
    tr.dataset.byte = byte;

    tr.innerHTML = `
      <td><span class="char-pill">${escapeHtml(charDisplay)}</span></td>
      <td><code>0x${byte.toString(16).toUpperCase().padStart(2, '0')}</code> (${byte})</td>
      <td><strong>${freq}</strong> <span class="text-muted">(${percentage}%)</span></td>
      <td><code class="code-badge">${code}</code></td>
      <td>${code.length} bits</td>
      <td class="${bitsSaved >= 0 ? 'text-success' : 'text-danger'}">${bitsSaved > 0 ? '+' : ''}${bitsSaved} bits</td>
    `;

    tr.addEventListener('click', () => {
      if (treeVisualizer) {
        document.querySelector('[data-tab="visualizerTab"]').click();
        treeVisualizer.highlight(byte);
      }
    });

    tbody.appendChild(tr);
  });
}

function filterTable(query) {
  document.querySelectorAll('#codeTableBody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

function renderBitstreamPreview(uint8Array, totalBits) {
  const container = document.getElementById('bitstreamPreview');
  if (!container) return;

  const previewBytes = Math.min(uint8Array.length, 24);
  let hexHeader = '';
  for (let i = 0; i < previewBytes; i++) {
    hexHeader += uint8Array[i].toString(16).toUpperCase().padStart(2, '0') + ' ';
  }
  if (uint8Array.length > previewBytes) hexHeader += '...';

  let binaryStream = '';
  for (let i = 0; i < Math.min(uint8Array.length, 12); i++) {
    binaryStream += uint8Array[i].toString(2).padStart(8, '0') + ' ';
  }
  if (uint8Array.length > 12) binaryStream += '...';

  container.innerHTML = `
    <div class="bit-preview-box">
      <div class="bit-preview-item">
        <label>Binary Header & Data (First ${previewBytes} bytes Hex):</label>
        <code>${hexHeader}</code>
      </div>
      <div class="bit-preview-item">
        <label>Raw Byte Bitstream Sample:</label>
        <code>${binaryStream}</code>
      </div>
    </div>
  `;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
