"""
Huffman Algorithm Test Suite
Validates lossless compression and decompression against multiple datasets.
"""
import heapq
from collections import Counter
import struct
import sys

# Support UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

def test_huffman_concept():
    samples = [
        "To be, or not to be, that is the question",
        "AAAAABBBBBBBCCCCCDDDDDDDDDDDEEEEEEEEEEEEEEEFFFFFFFFFFFFFFFFFFFFFF",
        "Pack my box with five dozen liquor jugs.",
        "A", # Single char edge case
        "Special chars: !@#$%^&*()_+-=[]{}|;':\",.<>/?\n\t\r",
        "Emoji & Unicode: 🚀🔥💻🎯💡"
    ]

    for sample in samples:
        data = sample.encode('utf-8')
        freq = Counter(data)

        # Min heap building
        heap = [[weight, [sym, ""]] for sym, weight in freq.items()]
        heapq.heapify(heap)

        if len(heap) == 1:
            codes = {heap[0][1][0]: "0"}
        else:
            while len(heap) > 1:
                lo = heapq.heappop(heap)
                hi = heapq.heappop(heap)
                for pair in lo[1:]:
                    pair[1] = '0' + pair[1]
                for pair in hi[1:]:
                    pair[1] = '1' + pair[1]
                heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])
            
            codes = {pair[0]: pair[1] for pair in heap[0][1:]}

        # Encode
        bitstr = "".join(codes[byte] for byte in data)
        pad = (8 - (len(bitstr) % 8)) % 8
        bitstr += "0" * pad

        # Pack into bytes
        packed = bytearray()
        for i in range(0, len(bitstr), 8):
            packed.append(int(bitstr[i:i+8], 2))

        # Decode
        reversed_codes = {v: k for k, v in codes.items()}
        decoded_bytes = bytearray()
        cur = ""
        total_bits = len(bitstr) - pad

        # Unpack bits
        unpacked_bits = "".join(f"{b:08b}" for b in packed)[:total_bits]
        for bit in unpacked_bits:
            cur += bit
            if cur in reversed_codes:
                decoded_bytes.append(reversed_codes[cur])
                cur = ""

        decoded_text = decoded_bytes.decode('utf-8')
        assert decoded_text == sample, f"Mismatch for sample: {sample}"
        print(f"✅ Passed test for sample ({len(sample)} chars, {len(data)} bytes -> {len(packed)} packed bytes)")

    print("\n🎉 All Huffman validation tests passed successfully!")

if __name__ == "__main__":
    test_huffman_concept()
