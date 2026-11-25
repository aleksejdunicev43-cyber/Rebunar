package ru.rebunar.app

import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.io.FileNotFoundException
import java.util.Locale
import org.json.JSONObject

class MainActivity : Activity() {
    companion object {
        private const val APP_URL = "https://rebunar.pythonanywhere.com/new"
        private const val APP_HOST = "rebunar.pythonanywhere.com"
        private const val FILE_PICKER_REQUEST = 4102
        private const val LATEST_RELEASE_API = "https://api.github.com/repos/aleksejdunicev43-cyber/Rebunar/releases/latest"
    }

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private lateinit var browserPanel: LinearLayout
    private lateinit var browserWebView: WebView
    private lateinit var browserAddress: TextView
    private var filePathCallback: android.webkit.ValueCallback<Array<Uri>>? = null
    private var hasEnteredForeground = false
    private var updateDialogVisible = false
    private var updateDownloadId = -1L
    private var pendingInstallerUri: Uri? = null
    private var receiverRegistered = false

    private val updateDownloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) != updateDownloadId) return
            val uri = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).getUriForDownloadedFile(updateDownloadId)
            if (uri == null) {
                android.widget.Toast.makeText(this@MainActivity, "Не удалось скачать обновление.", android.widget.Toast.LENGTH_LONG).show()
            } else installDownloadedUpdate(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8, 9, 10)
        window.navigationBarColor = Color.rgb(8, 9, 10)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        buildScreen()
        configureWebView()
        registerUpdateReceiver()

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
        checkForUpdates()
    }

    private fun buildScreen() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(8, 9, 10))
        }

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            visibility = View.GONE
        }

        webView = WebView(this).apply {
            // Keep the native WebView surface dark while the first page is loading.
            setBackgroundColor(Color.rgb(8, 9, 10))
            isFocusable = true
            isFocusableInTouchMode = true
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
            }
            requestFocus(View.FOCUS_DOWN)
        }

        errorPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(24), dp(28), dp(24))
            setBackgroundColor(Color.rgb(8, 9, 10))
            visibility = View.GONE
            addView(TextView(this@MainActivity).apply {
                text = "Не удалось подключиться к Rebunar"
                textSize = 18f
                gravity = Gravity.CENTER
                setTextColor(Color.WHITE)
            })
            addView(TextView(this@MainActivity).apply {
                text = "Проверь интернет-соединение и попробуй ещё раз."
                textSize = 14f
                gravity = Gravity.CENTER
                setTextColor(Color.LTGRAY)
                setPadding(0, dp(10), 0, dp(18))
            })
            addView(Button(this@MainActivity).apply {
                text = "Повторить"
                isAllCaps = false
                setOnClickListener { refreshPage() }
            })
        }

        val content = FrameLayout(this)
        content.addView(webView, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        content.addView(errorPanel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        browserPanel = buildBrowserPanel()
        content.addView(browserPanel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        root.addView(progress, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(3)
        ))
        root.addView(content, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        setContentView(root)
    }

    @Suppress("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Expose Android-only actions in the bundled frontend.
            userAgentString = userAgentString + " RebunarAndroid"
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                safeBrowsingEnabled = true
            }
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }

        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun open(url: String, title: String?) {
                runOnUiThread { openInternalBrowser(url, title.orEmpty()) }
            }
        }, "AndroidBrowser")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val uri = request?.url ?: return null
                if (uri.scheme != "https" || uri.host != APP_HOST) return null

                val path = uri.path ?: return null
                if (path == "/new" || path == "/new/" || path.startsWith("/new/")) {
                    return serveBundledFrontend(path)
                }

                // All non-frontend paths, including /api/**, remain real HTTPS requests.
                return null
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return true

                if (uri.scheme == "https" && uri.host == APP_HOST) return false

                if (uri.scheme == "rebunar" && uri.host == "studio" && uri.path == "/editor") {
                    openGodotEditor()
                    return true
                }

                if (uri.scheme == "https" || uri.scheme == "http") {
                    runCatching {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    }
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                errorPanel.visibility = View.GONE
                progress.visibility = View.VISIBLE
                progress.progress = 5
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
                errorPanel.visibility = View.GONE
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) showConnectionError()
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                handler?.cancel()
                showConnectionError()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                if (newProgress >= 100) progress.visibility = View.GONE
            }

            override fun onShowFileChooser(
                webView: WebView?,
                callback: android.webkit.ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                return try {
                    startActivityForResult(intent, FILE_PICKER_REQUEST)
                    true
                } catch (_: Exception) {
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = null
                    false
                }
            }
        }
    }

    /**
     * Serves the frontend shipped inside this signed APK while keeping the
     * original HTTPS origin. API requests are deliberately not intercepted.
     */
    private fun serveBundledFrontend(path: String): WebResourceResponse {
        val assetPath = when (path) {
            "/new", "/new/" -> "build/index.html"
            else -> {
                if (!path.startsWith("/new/build/")) {
                    return notFoundResponse()
                }
                path.removePrefix("/new/")
            }
        }

        val segments = assetPath.split("/")
        if (segments.isEmpty() || segments.any {
                it.isEmpty() || it == "." || it == ".." || it.contains(92.toChar())
            }) {
            return notFoundResponse()
        }

        val mimeType = when (assetPath.substringAfterLast('.', "").lowercase(Locale.ROOT)) {
            "html" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "json", "map" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "wasm" -> "application/wasm"
            else -> "application/octet-stream"
        }

        return try {
            val stream = assets.open(assetPath)
            WebResourceResponse(
                mimeType,
                if (mimeType.startsWith("text/") ||
                    mimeType == "application/javascript" ||
                    mimeType == "application/json"
                ) "UTF-8" else null,
                200,
                "OK",
                mapOf(
                    "Cache-Control" to "no-store",
                    "X-Content-Type-Options" to "nosniff"
                ),
                stream
            )
        } catch (_: FileNotFoundException) {
            // Fail closed: never fetch a missing executable asset from the server.
            notFoundResponse()
        } catch (_: Exception) {
            notFoundResponse()
        }
    }

    private fun notFoundResponse(): WebResourceResponse =
        WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            mapOf("Cache-Control" to "no-store"),
            ByteArrayInputStream("Bundled Rebunar asset not found".toByteArray(Charsets.UTF_8))
        )

    /**
     * Launch the Godot Android Editor packaged inside this APK.
     * Godot reads command-line arguments only from an explicit, non-exported activity.
     */
    private fun openGodotEditor() {
        val editorIntent = Intent().apply {
            component = android.content.ComponentName(
                this@MainActivity,
                "org.godotengine.editor.GodotEditor"
            )
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("command_line_params", arrayOf("--project-manager"))
        }

        try {
            startActivity(editorIntent)
        } catch (error: Exception) {
            android.widget.Toast.makeText(
                this,
                "Не удалось открыть Godot Editor: " + (error.localizedMessage ?: "ошибка запуска"),
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }



    private fun registerUpdateReceiver() {
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(updateDownloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(updateDownloadReceiver, filter)
        }
        receiverRegistered = true
    }

    private fun checkForUpdates() {
        Thread {
            val release = runCatching {
                val connection = (URL(LATEST_RELEASE_API).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 7000
                    readTimeout = 7000
                    requestMethod = "GET"
                    setRequestProperty("Accept", "application/vnd.github+json")
                    setRequestProperty("User-Agent", "Rebunar-Android")
                }
                try {
                    if (connection.responseCode !in 200..299) return@runCatching null
                    JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                } finally {
                    connection.disconnect()
                }
            }.getOrNull() ?: return@Thread

            val latestTag = release.optString("tag_name").removePrefix("v")
            val currentVersion = packageManager.getPackageInfo(packageName, 0).versionName.orEmpty()
            val apkUrl = release.optJSONArray("assets")?.let { assets ->
                (0 until assets.length()).map { assets.getJSONObject(it) }
                    .firstOrNull { it.optString("name") == "app-debug.apk" }
                    ?.optString("browser_download_url")
            }.orEmpty()
            if (latestTag.isBlank() || apkUrl.isBlank() || compareVersions(latestTag, currentVersion) <= 0) return@Thread

            runOnUiThread {
                if (isFinishing || isDestroyed || updateDialogVisible) return@runOnUiThread
                updateDialogVisible = true
                AlertDialog.Builder(this)
                    .setTitle("Доступно обновление Rebunar")
                    .setMessage("Новая версия $latestTag уже готова. Скачать и установить обновление?")
                    .setPositiveButton("Обновить") { _, _ -> downloadUpdate(apkUrl, latestTag) }
                    .setNegativeButton("Позже", null)
                    .setOnDismissListener { updateDialogVisible = false }
                    .show()
            }
        }.start()
    }

    private fun compareVersions(first: String, second: String): Int {
        val a = first.split('.').map { it.toIntOrNull() ?: 0 }
        val b = second.split('.').map { it.toIntOrNull() ?: 0 }
        for (index in 0 until maxOf(a.size, b.size)) {
            val left = a.getOrElse(index) { 0 }
            val right = b.getOrElse(index) { 0 }
            if (left != right) return left.compareTo(right)
        }
        return 0
    }

    private fun downloadUpdate(apkUrl: String, version: String) {
        val uri = runCatching { Uri.parse(apkUrl) }.getOrNull()
        if (uri?.scheme != "https" || uri.host != "github.com") {
            android.widget.Toast.makeText(this, "Ссылка обновления недействительна.", android.widget.Toast.LENGTH_LONG).show()
            return
        }
        val request = DownloadManager.Request(uri).apply {
            setTitle("Обновление Rebunar $version")
            setDescription("Загрузка установочного файла")
            setMimeType("application/vnd.android.package-archive")
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setAllowedOverMetered(true)
            setAllowedOverRoaming(false)
        }
        updateDownloadId = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        android.widget.Toast.makeText(this, "Обновление загружается. Уведомление появится после загрузки.", android.widget.Toast.LENGTH_LONG).show()
    }

    private fun installDownloadedUpdate(uri: Uri) {
        if (Build.VERSION.SDK_INT >= 26 && !packageManager.canRequestPackageInstalls()) {
            pendingInstallerUri = uri
            AlertDialog.Builder(this)
                .setTitle("Разрешение на установку")
                .setMessage("Разреши Rebunar устанавливать обновления из этого источника. Это системное разрешение Android.")
                .setPositiveButton("Открыть настройки") { _, _ ->
                    val settings = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:$packageName"))
                    startActivity(settings)
                }
                .setNegativeButton("Отмена", null)
                .show()
            return
        }
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            startActivity(installIntent)
        } catch (_: Exception) {
            android.widget.Toast.makeText(this, "Android не смог открыть установщик. APK сохранён в загрузках.", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    private fun buildBrowserPanel(): LinearLayout {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(8, 9, 10))
            visibility = View.GONE
        }
        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(6), dp(5), dp(6), dp(5))
            setBackgroundColor(Color.rgb(17, 21, 19))
        }
        fun toolButton(label: String, action: () -> Unit): Button =
            Button(this).apply {
                text = label
                isAllCaps = false
                textSize = 13f
                minWidth = dp(42)
                setPadding(dp(4), 0, dp(4), 0)
                setOnClickListener { action() }
            }
        toolbar.addView(toolButton("‹") { if (browserWebView.canGoBack()) browserWebView.goBack() })
        toolbar.addView(toolButton("›") { if (browserWebView.canGoForward()) browserWebView.goForward() })
        browserAddress = TextView(this).apply {
            text = "https://"
            textSize = 12f
            setTextColor(Color.LTGRAY)
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.MIDDLE
            setPadding(dp(8), 0, dp(8), 0)
        }
        toolbar.addView(browserAddress, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        toolbar.addView(toolButton("↻") { browserWebView.reload() })
        toolbar.addView(toolButton("✕") { closeInternalBrowser() })
        browserWebView = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 9, 10))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
        }
        browserWebView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                return uri.scheme != "https" && uri.scheme != "http"
            }
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                browserAddress.text = url ?: ""
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                browserAddress.text = url ?: ""
            }
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: android.net.http.SslError?) {
                handler?.cancel()
            }
        }
        panel.addView(toolbar, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(48)
        ))
        panel.addView(browserWebView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        return panel
    }

    private fun openInternalBrowser(rawUrl: String, title: String) {
        val uri = runCatching { Uri.parse(rawUrl) }.getOrNull() ?: return
        if (uri.scheme != "https" && uri.scheme != "http") return
        if (uri.host.isNullOrBlank()) return
        browserAddress.text = title.ifBlank { uri.host ?: rawUrl }
        browserPanel.visibility = View.VISIBLE
        browserWebView.loadUrl(uri.toString())
    }

    private fun closeInternalBrowser() {
        browserWebView.stopLoading()
        browserWebView.loadUrl("about:blank")
        browserPanel.visibility = View.GONE
    }

    private fun refreshPage() {
        errorPanel.visibility = View.GONE
        if (webView.url.isNullOrBlank()) webView.loadUrl(APP_URL) else webView.reload()
    }

    private fun showConnectionError() {
        progress.visibility = View.GONE
        if (!webView.url.isNullOrBlank()) errorPanel.visibility = View.VISIBLE
    }

    @Deprecated("Used by the Android document picker for WebView file uploads")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK && data?.data != null) {
                arrayOf(data.data!!)
            } else null
            filePathCallback?.onReceiveValue(result)
            filePathCallback = null
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onResume() {
        super.onResume()
        pendingInstallerUri?.let { uri ->
            if (Build.VERSION.SDK_INT < 26 || packageManager.canRequestPackageInstalls()) {
                pendingInstallerUri = null
                installDownloadedUpdate(uri)
            }
        }
        if (!hasEnteredForeground) {
            hasEnteredForeground = true
        }
    }

    override fun onBackPressed() {
        if (::browserPanel.isInitialized && browserPanel.visibility == View.VISIBLE) {
            if (browserWebView.canGoBack()) browserWebView.goBack() else closeInternalBrowser()
        } else if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (receiverRegistered) unregisterReceiver(updateDownloadReceiver)
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
