/**
 * Huffman Coding Algorithm Core
 * - MinHeap based binary tree generation
 * - True binary bit-packing and bit-unpacking
 * - Complete lossless encoder and decoder
 * - Deterministic tie-breaking for reliable reconstruction
 */
import { MinHeap } from './minheap.js';

export class HuffmanNode {
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

export class HuffmanCodec {
  static MAGIC = [0x48, 0x55, 0x46, 0x46]; // "HUFF"

  /**
   * Build frequency map from Uint8Array input
   */
  static getFrequencyMap(uint8Data) {
    const freqMap = new Map();
    for (let i = 0; i < uint8Data.length; i++) {
      const byte = uint8Data[i];
      freqMap.set(byte, (freqMap.get(byte) || 0) + 1);
    }
    return freqMap;
  }

  /**
   * Build Huffman Tree from frequency map
   */
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

  /**
   * Traverse tree to generate prefix codes { [byte]: '0101...' }
   */
  static generateCodes(root) {
    const codes = new Map();
    if (!root) return codes;

    function traverse(node, currentCode) {
      if (node.isLeaf()) {
        // If single character edge case had empty code, give it '0'
        codes.set(node.byte, currentCode || '0');
        return;
      }
      if (node.left) traverse(node.left, currentCode + '0');
      if (node.right) traverse(node.right, currentCode + '1');
    }

    traverse(root, '');
    return codes;
  }

  /**
   * Calculate Shannon Entropy (theoretical minimum bits per symbol)
   */
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

  /**
   * Compress arbitrary Uint8Array into a binary .huff file Uint8Array
   *
   * Binary Format:
   * [0..3]   : 4 bytes Magic "HUFF"
   * [4]      : 1 byte Padding bits count (0..7) in final data byte
   * [5..6]   : 2 bytes Symbol count N (Uint16BE)
   * Next N*5 bytes : For each symbol:
   *            - 1 byte: symbol (0..255)
   *            - 4 bytes: frequency (Uint32BE)
   * Remainder: Packed bitstream
   */
  static compress(inputBytes) {
    if (inputBytes.length === 0) {
      throw new Error("Input data is empty. Nothing to compress.");
    }

    const freqMap = this.getFrequencyMap(inputBytes);
    const root = this.buildTree(freqMap);
    const codes = this.generateCodes(root);

    // Calculate total encoded bit count
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

    // 1. Magic bytes
    for (let i = 0; i < 4; i++) {
      outputBuffer[i] = this.MAGIC[i];
    }

    // 2. Padding bits
    outputBuffer[4] = paddingBits;

    // 3. Symbol count (Uint16)
    dataView.setUint16(5, symbolCount, false);

    // 4. Frequency table
    let offset = 7;
    // Sort entries so header is deterministic
    const sortedEntries = Array.from(freqMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [byte, freq] of sortedEntries) {
      outputBuffer[offset] = byte;
      dataView.setUint32(offset + 1, freq, false);
      offset += 5;
    }

    // 5. Pack bitstream
    let currentByte = 0;
    let bitPosition = 7; // Fill from MSB (7) down to LSB (0)

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

    // Write final byte if not on boundary
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

  /**
   * Decompress a .huff Uint8Array back to original Uint8Array
   */
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
            break; // Finished reading all expected bytes
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
