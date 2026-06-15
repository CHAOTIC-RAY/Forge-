import { describe, expect, it } from 'vitest';
import {
  computeInferenceTilePlacement,
  detectScaleFromFilename,
  float16BitsToFloat32,
  float32ToFloat16Bits,
} from './esrganUpscaler';

describe('detectScaleFromFilename', () => {
  it('detects 4x from Nomos model name', () => {
    expect(detectScaleFromFilename('4xNomos2_otf_esrgan_fp16_opset17.onnx')).toBe(4);
  });

  it('detects 2x and 8x scales', () => {
    expect(detectScaleFromFilename('2xAnimeSharp.onnx')).toBe(2);
    expect(detectScaleFromFilename('model_8x_esrgan.onnx')).toBe(8);
  });

  it('defaults to 4x when scale is unknown', () => {
    expect(detectScaleFromFilename('custom_esrgan.onnx')).toBe(4);
  });
});

describe('float16 conversion', () => {
  it('round-trips common values', () => {
    for (const v of [0, 0.5, 1, 0.25, 0.75]) {
      const bits = float32ToFloat16Bits(v);
      const back = float16BitsToFloat32(bits);
      expect(Math.abs(back - v)).toBeLessThan(0.01);
    }
  });
});

describe('computeInferenceTilePlacement', () => {
  const tileSize = 256;
  const tilePad = 10;

  it('uses fixed 276×276 inference size for every tile', () => {
    const edge = computeInferenceTilePlacement(0, 0, 256, 256, 800, 600, tileSize, tilePad);
    const inner = computeInferenceTilePlacement(256, 256, 256, 256, 800, 600, tileSize, tilePad);
    expect(edge.inferenceSize).toBe(276);
    expect(inner.inferenceSize).toBe(276);
  });

  it('offsets edge tiles so content aligns with padding region', () => {
    const edge = computeInferenceTilePlacement(0, 0, 256, 256, 800, 600, tileSize, tilePad);
    expect(edge.dstX).toBe(10);
    expect(edge.dstY).toBe(10);

    const inner = computeInferenceTilePlacement(256, 256, 256, 256, 800, 600, tileSize, tilePad);
    expect(inner.dstX).toBe(0);
    expect(inner.dstY).toBe(0);
    expect(inner.extractW).toBe(276);
    expect(inner.extractH).toBe(276);
  });
});
