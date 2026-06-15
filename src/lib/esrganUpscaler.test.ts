import { describe, expect, it } from 'vitest';
import { detectScaleFromFilename } from './esrganUpscaler';

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
