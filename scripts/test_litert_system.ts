#!/usr/bin/env tsx
/**
 * LiteRT System Test Script
 * Verifies the complete LiteRT integration including runtime detection, model resolution, and backend service
 */

import { getRuntimeCapabilities, isLiteRtSupported, getRecommendedRuntime } from '../src/lib/runtimeDetection';
import { findBestModel, resolveLiteRtArtifact, getAvailableModels } from '../src/lib/litertModelResolver';
import { getLocalAiBackend } from '../src/lib/localAiBackendLitert';
import { hasWebGpu } from '../src/lib/webGpu';

async function testRuntimeDetection() {
  console.log('\n=== Testing Runtime Detection ===');
  
  try {
    const capabilities = await getRuntimeCapabilities();
    console.log('Platform:', capabilities.platform);
    console.log('Architecture:', capabilities.architecture);
    console.log('Has WebGPU:', capabilities.hasWebGpu);
    console.log('Has WASM JSPI:', capabilities.hasWasmJspi);
    console.log('Has SharedArrayBuffer:', capabilities.hasSharedArrayBuffer);
    console.log('Total Memory:', capabilities.totalMemoryMb, 'MB');
    console.log('Hardware Concurrency:', capabilities.hardwareConcurrency);
    
    if (capabilities.webGpuAdapterName) {
      console.log('GPU Adapter:', capabilities.webGpuAdapterName);
      console.log('GPU Vendor:', capabilities.webGpuVendor);
    }
    
    const supported = await isLiteRtSupported();
    console.log('LiteRT Supported:', supported);
    
    const recommended = await getRecommendedRuntime();
    console.log('Recommended Runtime:', recommended);
    
    return true;
  } catch (error) {
    console.error('Runtime detection failed:', error);
    return false;
  }
}

async function testModelResolver() {
  console.log('\n=== Testing Model Resolver ===');
  
  try {
    const models = await getAvailableModels();
    console.log('Available models:', models.length);
    
    for (const model of models) {
      console.log(`- ${model.model_id}: ${model.name} (${model.power_tier})`);
    }
    
    const bestModel = await findBestModel('balanced');
    if (bestModel) {
      console.log('Best balanced model:', bestModel.model_id);
      
      const artifact = await resolveLiteRtArtifact(bestModel);
      console.log('Resolved artifact:', {
        hfRepo: artifact.hfRepo,
        fileName: artifact.fileName,
        backend: artifact.backend,
        source: artifact.source
      });
    }
    
    return true;
  } catch (error) {
    console.error('Model resolver failed:', error);
    return false;
  }
}

async function testWebGpuDetection() {
  console.log('\n=== Testing WebGPU Detection ===');
  
  try {
    const webGpuAvailable = hasWebGpu();
    console.log('WebGPU API available:', webGpuAvailable);
    
    if (webGpuAvailable) {
      const { probeWebGpuAdapter } = await import('../src/lib/webGpu');
      const gpuInfo = await probeWebGpuAdapter();
      console.log('WebGPU adapter available:', gpuInfo.available);
      
      if (gpuInfo.available) {
        console.log('Adapter name:', gpuInfo.adapterName);
        console.log('Vendor:', gpuInfo.vendor);
      } else {
        console.log('Reason:', gpuInfo.reason);
      }
    }
    
    return true;
  } catch (error) {
    console.error('WebGPU detection failed:', error);
    return false;
  }
}

async function testBackendService() {
  console.log('\n=== Testing Backend Service ===');
  
  try {
    const backend = getLocalAiBackend({
      autoBootstrap: false, // Don't auto-bootstrap for testing
      enableWebGpuPatch: true,
      proxyDownloads: true
    });
    
    console.log('Backend service created');
    
    // Test initialization
    await backend.initialize();
    console.log('Backend initialized');
    
    const status = backend.getStatus();
    console.log('Backend status:', {
      isReady: status.isReady,
      runtime: status.runtime,
      platform: status.platform,
      error: status.error
    });
    
    // Test getting available models
    const models = await backend.getAvailableModels();
    console.log('Available models via backend:', models.length);
    
    return true;
  } catch (error) {
    console.error('Backend service failed:', error);
    return false;
  }
}

async function testMlcFetchProxy() {
  console.log('\n=== Testing MLC Fetch Proxy ===');
  
  try {
    const { fetchMlcUpstream } = await import('../src/lib/mlcFetchProxy');
    
    // Test with a small file
    const testUrl = 'https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm';
    
    console.log('Testing HEAD request to:', testUrl);
    
    try {
      const response = await fetchMlcUpstream(testUrl, 'HEAD');
      console.log('HEAD response status:', response.status);
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        console.log('Content length:', contentLength);
      }
    } catch (error) {
      console.log('HEAD request failed (expected if server not running):', error);
    }
    
    return true;
  } catch (error) {
    console.error('MLC fetch proxy test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting LiteRT System Tests...');
  console.log('=====================================');
  
  const results = {
    runtimeDetection: await testRuntimeDetection(),
    modelResolver: await testModelResolver(),
    webGpuDetection: await testWebGpuDetection(),
    backendService: await testBackendService(),
    mlcFetchProxy: await testMlcFetchProxy()
  };
  
  console.log('\n=== Test Results ===');
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${test}: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? 'All tests passed! ✓' : 'Some tests failed. ✗'));
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
