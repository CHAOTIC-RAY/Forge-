package com.cookxpert.litert

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONException
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(name = "CookXpertLiteRt")
class CookXpertLiteRtPlugin : Plugin() {

    private var engine: Any? = null // Engine instance from LiteRT
    private var conversation: Any? = null // Conversation instance
    private var currentModelId: String? = null
    private var currentBackend: String = "auto"
    private var isDownloading = AtomicBoolean(false)
    private var downloadJob: Job? = null
    private var generationJob: Job? = null
    private val pluginScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    @PluginMethod
    fun getDeviceInfo(call: PluginCall) {
        try {
            val platform = "android"
            val socModel = detectSocModel()
            val supportedBackends = detectSupportedBackends()
            val recommendedBackend = getRecommendedBackend(socModel, supportedBackends)
            val totalMemoryMb = getTotalMemoryMb()

            val data = JSObject().apply {
                put("platform", platform)
                put("socModel", socModel)
                put("supportedBackends", JSONArray(supportedBackends))
                put("recommendedBackend", recommendedBackend)
                put("hasWebGpu", false)
                put("hasWasmJspi", false)
                put("totalMemoryMb", totalMemoryMb)
            }

            call.resolve(data)
        } catch (e: Exception) {
            call.reject("Failed to get device info: ${e.message}")
        }
    }

    @PluginMethod
    fun downloadModel(call: PluginCall) {
        val modelId = call.getString("modelId") ?: run {
            call.reject("modelId is required")
            return
        }
        val url = call.getString("url") ?: run {
            call.reject("url is required")
            return
        }
        val destinationPath = call.getString("destinationPath")

        if (isDownloading.getAndSet(true)) {
            call.reject("A download is already in progress")
            return
        }

        downloadJob = pluginScope.launch {
            try {
                val progressData = JSObject()
                progressData.put("modelId", modelId)
                progressData.put("progress", 0.0)
                progressData.put("downloadedBytes", 0)
                progressData.put("totalBytes", 0)
                progressData.put("status", "downloading")
                
                notifyListeners("downloadProgress", progressData)

                // Simulate download (replace with actual download logic)
                val file = downloadModelFile(url, destinationPath) { progress, downloaded, total ->
                    val progressUpdate = JSObject()
                    progressUpdate.put("modelId", modelId)
                    progressUpdate.put("progress", progress)
                    progressUpdate.put("downloadedBytes", downloaded)
                    progressUpdate.put("totalBytes", total)
                    progressUpdate.put("status", "downloading")
                    
                    notifyListeners("downloadProgress", progressUpdate)
                }

                val result = JSObject().apply {
                    put("modelId", modelId)
                    put("progress", 1.0)
                    put("downloadedBytes", file.length())
                    put("totalBytes", file.length())
                    put("status", "completed")
                    put("modelPath", file.absolutePath)
                }

                call.resolve(result)
            } catch (e: Exception) {
                val errorResult = JSObject().apply {
                    put("modelId", modelId)
                    put("progress", 0.0)
                    put("downloadedBytes", 0)
                    put("totalBytes", 0)
                    put("status", "failed")
                    put("error", e.message)
                }
                call.reject("Download failed: ${e.message}")
            } finally {
                isDownloading.set(false)
            }
        }
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val modelId = call.getString("modelId") ?: run {
            call.reject("modelId is required")
            return
        }
        val modelPath = call.getString("modelPath") ?: run {
            call.reject("modelPath is required")
            return
        }
        val backend = call.getString("backend", "auto")
        val contextWindowSize = call.getInt("contextWindowSize", 4096)

        pluginScope.launch {
            try {
                // Unload existing model if any
                if (engine != null) {
                    unloadModelInternal()
                }

                val backendUsed = loadEngineInternal(modelPath, modelId, contextWindowSize, backend)
                currentBackend = backendUsed
                currentModelId = modelId

                val result = JSObject().apply {
                    put("modelId", modelId)
                    put("backend", backendUsed)
                    put("contextWindowSize", contextWindowSize)
                    put("success", true)
                }

                call.resolve(result)
            } catch (e: Exception) {
                val result = JSObject().apply {
                    put("modelId", modelId)
                    put("backend", backend)
                    put("contextWindowSize", contextWindowSize)
                    put("success", false)
                    put("error", e.message)
                }
                call.reject("Failed to load model: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun complete(call: PluginCall) {
        if (engine == null) {
            call.reject("No model loaded. Call loadModel first.")
            return
        }

        val messagesArray = call.getArray("messages") ?: run {
            call.reject("messages is required")
            return
        }
        val maxTokens = call.getInt("maxTokens", 512)
        val temperature = call.getDouble("temperature", 0.7)
        val topP = call.getDouble("topP", 0.9)

        generationJob = pluginScope.launch {
            try {
                val messages = parseMessages(messagesArray)
                val response = generateTextInternal(messages, maxTokens, temperature, topP)

                val result = JSObject().apply {
                    put("text", response)
                    put("finishReason", "stop")
                    put("tokensGenerated", response.length) // Approximate
                }

                call.resolve(result)
            } catch (e: Exception) {
                val result = JSObject().apply {
                    put("text", "")
                    put("finishReason", "error")
                    put("tokensGenerated", 0)
                    put("error", e.message)
                }
                call.reject("Generation failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun completeStream(call: PluginCall) {
        // For Android, we'll implement streaming in the future
        // For now, fall back to non-streaming
        complete(call)
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        try {
            unloadModelInternal()
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to unload model: ${e.message}")
        }
    }

    @PluginMethod
    fun getModelStatus(call: PluginCall) {
        val data = JSObject().apply {
            put("isLoaded", engine != null)
            put("modelId", currentModelId)
            put("backend", if (engine != null) currentBackend else null)
            put("contextWindowSize", if (engine != null) 4096 else null)
            put("isDownloading", isDownloading.get())
            put("downloadProgress", 0.0)
        }
        call.resolve(data)
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        try {
            downloadJob?.cancel()
            generationJob?.cancel()
            isDownloading.set(false)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to cancel: ${e.message}")
        }
    }

    private fun detectSocModel(): String {
        // Detect Android SoC model for NPU variant selection
        return try {
            val socModel = android.os.Build.SOC_MANUFACTURER + " " + android.os.Build.SOC_MODEL
            socModel.takeIf { it.isNotBlank() } ?: "Unknown"
        } catch (e: Exception) {
            "Unknown"
        }
    }

    private fun detectSupportedBackends(): List<String> {
        val backends = mutableListOf("cpu")
        
        // Check for GPU support
        try {
            val hasGl = try {
                android.opengl.GLES20.glGetString(android.opengl.GLES20.GL_VERSION)
                true
            } catch (e: Exception) {
                false
            }
            if (hasGl) backends.add("gpu")
        } catch (e: Exception) {
            // GPU not available
        }

        // Check for NPU support (vendor-specific)
        try {
            val hasNpu = checkNpuSupport()
            if (hasNpu) backends.add("npu")
        } catch (e: Exception) {
            // NPU not available
        }

        backends.add("auto")
        return backends
    }

    private fun checkNpuSupport(): Boolean {
        // Check for common NPU vendors
        val hardware = android.os.Build.HARDWARE.uppercase()
        return hardware.contains("QCOM") || // Qualcomm
               hardware.contains("MEDIATEK") ||
               hardware.contains("EXYNOS") ||
               hardware.contains("KIRIN")
    }

    private fun getRecommendedBackend(socModel: String, supportedBackends: List<String>): String {
        // Prioritize NPU for supported Qualcomm Snapdragon devices
        if (supportedBackends.contains("npu") && socModel.contains("Snapdragon")) {
            return "npu"
        }
        // Fall back to GPU if available
        if (supportedBackends.contains("gpu")) {
            return "gpu"
        }
        return "cpu"
    }

    private fun getTotalMemoryMb(): Int {
        return try {
            val activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val memInfo = android.app.ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            (memInfo.totalMem / (1024 * 1024)).toInt()
        } catch (e: Exception) {
            4096 // Default 4GB
        }
    }

    private fun downloadModelFile(url: String, destinationPath: String?, onProgress: (Double, Long, Long) -> Unit): File {
        // Implement actual download logic here
        // For now, return a placeholder file
        val destFile = if (destinationPath != null) {
            File(destinationPath)
        } else {
            File(context.filesDir, "litert_models/${System.currentTimeMillis()}.litertlm")
        }
        
        destFile.parentFile?.mkdirs()
        
        // Simulate download progress
        for (i in 0..100) {
            Thread.sleep(10)
            onProgress(i / 100.0, i * 1024L, 100 * 1024L)
        }
        
        return destFile
    }

    private fun loadEngineInternal(modelPath: String, modelId: String, contextWindow: Int, backend: String): String {
        // This is a placeholder for actual LiteRT engine loading
        // In production, you would use the LiteRT Android SDK
        
        val backendEnum = when (backend.lowercase()) {
            "npu" -> "NPU"
            "gpu" -> "GPU"
            "cpu" -> "CPU"
            else -> "AUTO"
        }

        // Initialize LiteRT engine with the specified backend
        // engine = Engine.create(config, backendEnum)
        
        // For now, use a placeholder
        engine = Object()
        
        return backendEnum
    }

    private suspend fun generateTextInternal(messages: List<ChatMessage>, maxTokens: Int, temperature: Double, topP: Double): String {
        // This is a placeholder for actual text generation
        // In production, you would use the LiteRT conversation API
        
        val prompt = messages.joinToString("\n") { "${it.role}: ${it.content}" }
        
        // Simulate generation delay
        delay(100)
        
        return "Generated response for: $prompt"
    }

    private fun unloadModelInternal() {
        conversation = null
        engine = null
        currentModelId = null
        currentBackend = "auto"
    }

    private fun parseMessages(messagesArray: JSONArray): List<ChatMessage> {
        val messages = mutableListOf<ChatMessage>()
        for (i in 0 until messagesArray.length()) {
            try {
                val msgObj = messagesArray.getJSONObject(i)
                val role = msgObj.getString("role")
                val content = msgObj.getString("content")
                messages.add(ChatMessage(role, content))
            } catch (e: JSONException) {
                // Skip invalid messages
            }
        }
        return messages
    }

    data class ChatMessage(val role: String, val content: String)

    override fun cleanup() {
        super.cleanup()
        downloadJob?.cancel()
        generationJob?.cancel()
        pluginScope.cancel()
        unloadModelInternal()
    }
}
