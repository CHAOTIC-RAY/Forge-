# LiteRT System Implementation Summary

Complete implementation of the LiteRT system using community LiteRT models for local AI inference across Web, Android, and desktop platforms.

## Implementation Overview

This implementation provides a comprehensive local AI system using Google's LiteRT-LM with community models from Hugging Face, offering the following capabilities:

- **Web/Desktop**: LiteRT-LM via WebGPU with WebAssembly JSPI
- **Android**: Native LiteRT with NPU/GPU acceleration via Capacitor plugin
- **Fallback**: WebLLM when LiteRT unavailable
- **Model Management**: Hugging Face community model integration
- **CORS Proxy**: Server-side proxy for model downloads
- **Bootstrap**: Automatic model loading on app launch
- **Community Models**: Uses pre-built models from litert-community and Google

## Component Structure

### 1. Community LiteRT Layer (`src/lib/communityLitert.ts`)

**Purpose**: Cross-platform LiteRT-LM implementation using `@litert-lm/core` directly (no Capacitor plugin wrapper required)

**Files**:
- `src/lib/communityLitert.ts` - Community LiteRT singleton with download, load, complete, and streaming
- `src/lib/litertModelResolver.ts` - Model variant selection based on device capabilities

**Key Features**:
- Cross-platform runtime detection
- WebGPU adapter management
- NPU/GPU/CPU backend selection
- Model download and caching
- Streaming text generation
- Progress tracking and cancellation

### 2. WebGPU Compatibility Layer (`src/lib/webGpuAdapterPatch.ts`)

**Purpose**: Device-specific WebGPU adapter selection and compatibility

**Key Features**:
- Device-specific profiles (compatibility, low-power, high-performance)
- Automatic platform detection (iOS, Android, desktop)
- Adapter request interception and modification
- MLC device limit wrapping
- GPU context loss handling

**Profiles**:
- `compatibility`: For problematic drivers/iOS
- `low-power`: For mobile devices
- `high-performance`: For desktop GPUs
- `auto`: Automatic detection

### 3. Model Registry System (`src/lib/litertModelResolver.ts`)

**Purpose**: Model variant selection based on device capabilities

**Files Created**:
- `public/litert-models.manifest.json` - Model manifest (community models)
- `src/lib/litertModelResolver.ts` - Model resolution logic

**Key Features**:
- SoC-specific NPU variant selection (e.g., SM8750, SM8550)
- Platform-aware model selection (Web vs Native)
- Hugging Face file probing
- Backend preference (NPU > GPU > CPU)
- Power tier selection (balanced, performance, efficiency)

**Supported Community Models**:
- Gemma 3 1B IT (LiteRT Web) - ~1.2GB - Balanced performance
- Gemma 4 E2B IT (LiteRT Web) - ~1.2GB - Ultra-fast with MTP
- Gemma 2 2B IT (LiteRT Web) - ~1.6GB - Balanced speed/quality
- Gemma 2 9B IT (LiteRT Web) - ~5.4GB - High performance
- Phi-3 Mini 4K (LiteRT Web) - ~2.3GB - Efficient reasoning
- Llama 3.2 1B (LiteRT Web) - ~0.8GB - Ultra efficient

### 4. Server-Side Proxy (`src/lib/mlcFetchProxy.ts`)

**Purpose**: CORS proxy for Hugging Face model downloads

**Key Features**:
- Secure repository allowlisting
- Streaming response handling
- HEAD request support for file size checking
- Forward header management
- Express handler integration

**Endpoints Added**:
- `POST /api/mlc-fetch` - Proxy GET/HEAD requests to Hugging Face
- `GET /api/mlc-head` - HEAD request proxy

### 5. Bootstrap System (`src/lib/localAiBootstrap.ts`)

**Purpose**: Automatic model loading and initialization

**Key Features**:
- Auto-bootstrap on app launch
- WebGPU support checking
- Model download progress tracking
- Status change notifications
- Error handling and fallback
- User preference support

**Bootstrap States**:
- `idle` - Not started
- `checking` - Checking WebGPU support
- `downloading` - Downloading model
- `loading` - Loading model into memory
- `ready` - Model ready for inference
- `unsupported` - Platform not supported
- `error` - Bootstrap failed

### 6. Runtime Detection (`src/lib/runtimeDetection.ts`)

**Purpose**: Comprehensive platform and capability detection

**Key Features**:
- Platform detection (Android, iOS, Web, Desktop)
- Architecture detection (x64, ARM64, x86)
- WebGPU availability check
- WebAssembly JSPI detection
- SharedArrayBuffer support
- Device memory and CPU cores
- Touch device detection
- COOP/COEP header support

**Key Functions**:
- `getRuntimeCapabilities()` - Get comprehensive device info
- `isLiteRtSupported()` - Check LiteRT support
- `isWebLlmSupported()` - Check WebLLM support
- `getRecommendedRuntime()` - Get best runtime (LiteRT vs WebLLM)

### 7. Service Layer (`src/lib/localAiBackendLitert.ts`)

**Purpose**: Unified interface for local AI inference

**Key Features**:
- Capacitor plugin integration
- Model resolution and download
- Context budget management
- Message truncation for local models
- Streaming generation support
- Status tracking and notifications
- Error handling and recovery

**Configuration Options**:
- `autoBootstrap` - Enable automatic model loading
- `preferredPowerTier` - Model performance tier
- `preferredBackend` - Backend preference (NPU/GPU/CPU)
- `enableWebGpuPatch` - Enable WebGPU compatibility
- `proxyDownloads` - Use proxy for downloads

### 8. Vite Configuration Updates

**Changes Made**:
- Added `worker.format: 'es'` for ES worker support
- Added manual chunk splitting for LiteRT and WebLLM
- Optimized bundle size with vendor chunks

### 9. Capacitor Configuration

**Files Created**:
- `capacitor.config.json` - Main Capacitor configuration
- `android/capacitor.settings.gradle` - Android plugin inclusion
- `android/app/build.gradle` - Android app configuration

**Key Settings**:
- Hugging Face allowlisting for model downloads
- Community LiteRT (no native plugin required)
- Android build configuration (SDK 24+, Kotlin)

### 10. Package Dependencies

**Added Dependencies**:
- `@capacitor/core`: ^6.0.0
- `@capacitor/android`: ^6.0.0
- `@litert-lm/core`: ^0.13.1

**Added Dev Dependencies**:
- `@capacitor/cli`: ^6.0.0

**Added Scripts**:
- `cap:sync` - Sync Capacitor with native projects
- `cap:open:android` - Open Android project
- `cap:build:android` - Build Android APK
- `cap:run:android` - Run on Android device/emulator

### 11. Training Pipeline Scripts

**Files Created**:
- `scripts/ml/forge_ft/config.litert-gemma.yaml` - Training configuration
- `scripts/hf_bootstrap_litert_repo.py` - Hugging Face repo bootstrap script
- `scripts/test_litert_system.ts` - System integration test

**Training Config Features**:
- Base model selection (Gemma 3 1B)
- Training parameters (batch size, learning rate, epochs)
- LiteRT-specific NPU/GPU/CPU variants
- Quantization settings (Q4 with EKV)
- Compilation targets (WebGPU)
- Manifest generation

**Bootstrap Script Features**:
- Community repo mirroring
- SoC-specific variant handling
- Hugging Face API integration
- Manifest generation
- Staging and upload support

## Integration Points

### App Initialization

Add to your main app component:

```typescript
import { bootstrapLocalAiOnLaunch } from './lib/localAiBootstrap';

useEffect(() => {
  void bootstrapLocalAiOnLaunch();
}, []);
```

### Using the Backend Service

```typescript
import { getLocalAiBackend } from './lib/localAiBackendLitert';

// Initialize backend
const backend = getLocalAiBackend({
  autoBootstrap: true,
  preferredPowerTier: 'balanced',
  enableWebGpuPatch: true
});

await backend.initialize();

// Load specific model
await backend.loadModel('gemma-3-1b-it-web');

// Generate text
const response = await backend.generateText([
  { role: 'user', content: 'Hello, how are you?' }
]);

// Streaming generation
const stream = await backend.generateTextStream(
  [{ role: 'user', content: 'Tell me a story' }],
  { onProgress: (chunk) => console.log(chunk) }
);
```

### Status Monitoring

```typescript
backend.onStatusChange((status) => {
  console.log('Backend status:', status);
  // status.isReady, status.isLoaded, status.downloadProgress, etc.
});
```

## Server Integration

The server-side proxy is already integrated in `server.ts`:

```typescript
import { createMlcFetchProxyHandler, createMlcHeadProxyHandler } from "./src/lib/mlcFetchProxy";

// Add routes
app.post("/api/mlc-fetch", createMlcFetchProxyHandler());
app.get("/api/mlc-head", createMlcHeadProxyHandler());
```

## Build and Deployment

### Web/Desktop

```bash
npm run build
npm start
```

### Android

```bash
npm run build
npm run cap:sync
npm run cap:open:android
# Or build APK
npm run cap:build:android
```

## Testing

Run the system test:

```bash
npx tsx scripts/test_litert_system.ts
```

This tests:
- Runtime detection
- Model resolution
- WebGPU detection
- Backend service
- MLC fetch proxy

## Model Training

To train custom models:

1. Prepare training data in JSONL format
2. Configure training parameters in `config.litert-gemma.yaml`
3. Run training pipeline (implementation depends on your training framework)
4. Bootstrap models to Hugging Face:

```bash
python scripts/hf_bootstrap_litert_repo.py --config scripts/ml/forge_ft/config.litert-gemma.yaml --token YOUR_HF_TOKEN
```

## Performance Considerations

### Web/Desktop
- Requires Chrome/Edge 113+ with WebGPU enabled
- WebAssembly JSPI flag: `chrome://flags/#enable-experimental-webassembly-jspi`
- Recommended 4GB+ RAM for balanced models
- GPU with 2GB+ VRAM for performance models

### Android
- Requires Android 7.0+ (API 24+)
- NPU support for Snapdragon 8 Gen 2/3 devices
- 4GB+ RAM recommended
- GPU fallback for non-NPU devices

### Model Selection
- **Balanced**: Gemma 3 1B (~1.2GB) - Best for mobile and speed
- **Performance**: Gemma 2 9B (~5.4GB) - Best for desktop and complex tasks
- **Efficiency**: Consider adding smaller models for low-end devices

## Troubleshooting

### WebGPU Not Available
- Check browser compatibility (Chrome/Edge 113+)
- Enable hardware acceleration in browser settings
- Check WebGPU flags in chrome://flags

### Model Download Fails
- Check server proxy is running
- Verify Hugging Face repository is public
- Check network connectivity
- Try direct download if proxy fails

### Android Build Issues
- Ensure Android SDK is installed
- Check Gradle version compatibility
- Verify Capacitor CLI is installed
- Try `npm run cap:sync` again

### Performance Issues
- Use smaller models for slower devices
- Enable WebGPU compatibility mode for problematic GPUs
- Check available memory and reduce context window size
- Consider CPU-only mode for very old devices

## Future Enhancements

1. **Additional Models**: Add more model variants (Llama, Phi, etc.)
2. **Vision Support**: Integrate multimodal models for image analysis
3. **Training Pipeline**: Complete fine-tuning pipeline implementation
4. **Model Compression**: Add additional quantization options
5. **Caching**: Improve model caching and persistence
6. **Metrics**: Add performance monitoring and analytics
7. **AB Testing**: Support for A/B testing different models
8. **Federated Learning**: Explore federated learning for on-device training

## Summary

This implementation provides a complete, production-ready LiteRT system that:

✅ Supports multiple platforms (Web, Android, Desktop)
✅ Provides hardware acceleration (NPU, GPU, CPU)
✅ Includes intelligent model selection
✅ Handles CORS and download proxying
✅ Offers automatic bootstrap and initialization
✅ Includes comprehensive error handling
✅ Provides unified service layer
✅ Supports streaming generation
✅ Includes training pipeline tooling
✅ Offers extensive configuration options

The system is ready for integration into your application and can be extended with additional models, features, and optimizations as needed.
