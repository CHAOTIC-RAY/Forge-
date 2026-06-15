/** Nomos2 ONNX declares output with the same `height`/`width` dim_params as input. */
const ONNX_DIM_PATCHES: ReadonlyArray<readonly [string, string]> = [
  ['height', 'h_out_'],
  ['width', 'w_out'],
] as const;

function findSubarrayPositions(data: Uint8Array, needle: Uint8Array): number[] {
  const positions: number[] = [];
  if (needle.length === 0) return positions;
  for (let i = 0; i <= data.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (data[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) positions.push(i);
  }
  return positions;
}

export function isEsrganOnnxPatched(buffer: ArrayBuffer): boolean {
  const data = new Uint8Array(buffer);
  const enc = new TextEncoder();
  return findSubarrayPositions(data, enc.encode('h_out_')).length > 0;
}

/** Same-length rename of output spatial dim_params (idempotent). */
export function patchEsrganOnnxOutputDims(buffer: ArrayBuffer): ArrayBuffer {
  if (isEsrganOnnxPatched(buffer)) return buffer;

  const data = new Uint8Array(buffer.slice(0));
  const enc = new TextEncoder();

  for (const [oldStr, newStr] of ONNX_DIM_PATCHES) {
    const old = enc.encode(oldStr);
    const neu = enc.encode(newStr);
    if (old.length !== neu.length) {
      throw new Error(`ONNX dim patch length mismatch for ${oldStr}`);
    }

    const positions = findSubarrayPositions(data, old);
    if (positions.length === 0) continue;
    if (positions.length === 1) continue;
    if (positions.length !== 2) {
      throw new Error(`Unexpected "${oldStr}" count in ONNX model (${positions.length})`);
    }
    data.set(neu, positions[1]);
  }

  if (!isEsrganOnnxPatched(data.buffer)) {
    throw new Error('ESRGAN ONNX metadata patch did not apply');
  }

  return data.buffer;
}
