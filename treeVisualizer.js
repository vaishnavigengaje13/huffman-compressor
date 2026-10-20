/**
 * Interactive SVG Huffman Tree Visualizer
 * - Dynamic subtree coordinate calculation (Reingold-Tilford inspired layout)
 * - Pan & Zoom controls
 * - '0' / '1' edge labels
 * - Path highlighting when selecting characters
 * - Responsive rendering with tooltips
 */

export class TreeVisualizer {
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
        <span class="tree-hint">💡 Drag to Pan | Scroll to Zoom | Click a letter table row to trace path</span>
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

    // Pan with mouse drag
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

    // Zoom with scroll wheel
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

    // Main group for zoom/pan
    this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.g.setAttribute('id', 'treeGroup');
    this.svg.appendChild(this.g);

    // Compute layout
    const layout = this._computeLayout(root);

    // Render edges first
    this._renderEdges(layout);

    // Render nodes
    this._renderNodes(layout);

    // Auto-fit initial view
    this.fitView(layout);
  }

  _computeLayout(root) {
    // 1. Assign depth and leaf horizontal positions
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

    // Collect all nodes and edges in flat arrays
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

      // Edge line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', parent.x);
      line.setAttribute('y1', parent.y);
      line.setAttribute('x2', child.x);
      line.setAttribute('y2', child.y);
      line.setAttribute('stroke', isHighlighted ? '#10b981' : '#4b5563');
      line.setAttribute('stroke-width', isHighlighted ? '3.5' : '1.8');
      line.setAttribute('stroke-linecap', 'round');
      this.g.appendChild(line);

      // Edge Bit Label (0 or 1)
      const midX = (parent.x + child.x) / 2;
      const midY = (parent.y + child.y) / 2;

      // Circle background for bit
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', midX);
      bg.setAttribute('cy', midY);
      bg.setAttribute('r', '10');
      bg.setAttribute('fill', isHighlighted ? '#10b981' : '#1f2937');
      bg.setAttribute('stroke', isHighlighted ? '#ffffff' : '#374151');
      bg.setAttribute('stroke-width', '1.5');
      this.g.appendChild(bg);

      // Bit text
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

      // Node circle
      const radius = isLeaf ? 22 : 18;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', radius);

      if (isTargetLeaf) {
        circle.setAttribute('fill', '#10b981'); // Emerald highlight
        circle.setAttribute('stroke', '#ecfdf5');
        circle.setAttribute('stroke-width', '3');
      } else if (isAncestor) {
        circle.setAttribute('fill', '#047857');
        circle.setAttribute('stroke', '#6ee7b7');
        circle.setAttribute('stroke-width', '2.5');
      } else if (isLeaf) {
        circle.setAttribute('fill', '#2563eb'); // Blue for leaves
        circle.setAttribute('stroke', '#93c5fd');
        circle.setAttribute('stroke-width', '2');
      } else {
        circle.setAttribute('fill', '#1f2937'); // Slate for internal
        circle.setAttribute('stroke', '#64748b');
        circle.setAttribute('stroke-width', '2');
      }
      group.appendChild(circle);

      // Label inside circle (Frequency count)
      const freqText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      freqText.setAttribute('x', x);
      freqText.setAttribute('y', isLeaf ? y - 2 : y + 4.5);
      freqText.setAttribute('text-anchor', 'middle');
      freqText.setAttribute('fill', '#ffffff');
      freqText.setAttribute('font-size', isLeaf ? '11' : '12');
      freqText.setAttribute('font-weight', 'bold');
      freqText.textContent = node.freq;
      group.appendChild(freqText);

      // For leaf nodes: Character label pill below circle
      if (isLeaf) {
        const charLabel = TreeVisualizer.formatChar(node.byte);
        const leafCode = this.codes ? this.codes.get(node.byte) : '';

        // Character text below
        const charText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        charText.setAttribute('x', x);
        charText.setAttribute('y', y + 36);
        charText.setAttribute('text-anchor', 'middle');
        charText.setAttribute('fill', isTargetLeaf ? '#34d399' : '#f3f4f6');
        charText.setAttribute('font-size', '12');
        charText.setAttribute('font-weight', '600');
        charText.textContent = charLabel;
        group.appendChild(charText);

        // Code text underneath character
        const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        codeText.setAttribute('x', x);
        codeText.setAttribute('y', y + 50);
        codeText.setAttribute('text-anchor', 'middle');
        codeText.setAttribute('fill', '#9ca3af');
        codeText.setAttribute('font-size', '10');
        codeText.setAttribute('font-family', 'monospace');
        codeText.textContent = `[${leafCode}]`;
        group.appendChild(codeText);

        // Click to highlight
        group.addEventListener('click', () => {
          this.highlight(node.byte);
        });

        // Hover tooltip
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
      this.highlightedByte = null; // Toggle off
    } else {
      this.highlightedByte = byte;
    }
    this.render(this.root, this.codes, this.highlightedByte);

    // Sync highlight with table row
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
