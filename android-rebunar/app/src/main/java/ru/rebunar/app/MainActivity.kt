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
import android.view.inputmethod.EditorInfo
import android.util.Log
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
import android.widget.EditText
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
    private lateinit var browserAddress: EditText
    private lateinit var browserContent: FrameLayout
    private lateinit var browserTabsButton: Button
    private data class BrowserTab(val id: Int, val view: WebView, var title: String, var url: String)
    private val browserTabs = mutableListOf<BrowserTab>()
    private var activeBrowserTabId = -1
    private var nextBrowserTabId = 1
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
                    openInternalBrowser(uri.toString(), uri.host.orEmpty())
                }
                // Never hand web links to Chrome or another Android app.
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                Log.i("RebunarWeb", "PAGE_STARTED url=" + url)
                errorPanel.visibility = View.GONE
                progress.visibility = View.VISIBLE
                progress.progress = 5
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                Log.i("RebunarWeb", "PAGE_FINISHED url=" + url + " title=" + view?.title)
                view?.evaluateJavascript("JSON.stringify({ready:document.readyState,title:document.title,href:location.href,body:(document.body?.innerText||'').slice(0,1200),app:!!document.querySelector('#app')})") { result ->
                    Log.i("RebunarWeb", "PAGE_STATE " + result)
                }
                progress.visibility = View.GONE
                errorPanel.visibility = View.GONE
                CookieManager.getInstance().flush()
            }

            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                Log.e("RebunarWeb", "HTTP_ERROR url=" + request?.url + " status=" + errorResponse?.statusCode)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                Log.e("RebunarWeb", "LOAD_ERROR url=" + request?.url + " code=" + error?.errorCode + " description=" + error?.description)
                if (request?.isForMainFrame == true) showConnectionError()
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                Log.e("RebunarWeb", "SSL_ERROR url=" + error?.url + " primary=" + error?.primaryError)
                handler?.cancel()
                showConnectionError()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: android.webkit.ConsoleMessage?): Boolean {
                Log.e("RebunarWebConsole", message?.message() + " -- " + message?.sourceId() + ":" + message?.lineNumber())
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                Log.d("RebunarWeb", "PROGRESS " + newProgress)
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

        // A slim address field stays at the top; navigation controls live at the bottom.
        browserAddress = EditText(this).apply {
            setSingleLine(true)
            textSize = 13f
            setTextColor(Color.WHITE)
            setHintTextColor(Color.LTGRAY)
            hint = "Адрес сайта"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
            imeOptions = EditorInfo.IME_ACTION_GO
            setPadding(dp(14), 0, dp(14), 0)
            setBackgroundColor(Color.rgb(20, 19, 30))
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_GO) {
                    loadBrowserAddress()
                    true
                } else false
            }
        }

        browserContent = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(8, 9, 10))
        }

        val bottomBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(3), dp(8), dp(3))
            setBackgroundColor(Color.rgb(15, 13, 24))
        }

        fun bottomAction(icon: String, caption: String, description: String, action: () -> Unit): View {
            return LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                isClickable = true
                isFocusable = true
                contentDescription = description
                setPadding(0, dp(2), 0, dp(2))
                addView(TextView(this@MainActivity).apply {
                    text = icon
                    textSize = 22f
                    gravity = Gravity.CENTER
                    setTextColor(Color.rgb(202, 165, 255))
                }, LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, dp(25)
                ))
                addView(TextView(this@MainActivity).apply {
                    text = caption
                    textSize = 10f
                    gravity = Gravity.CENTER
                    setTextColor(Color.rgb(220, 214, 235))
                }, LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, dp(15)
                ))
                setOnClickListener { action() }
            }
        }

        bottomBar.addView(bottomAction("⌂", "Главная", "Вернуться в Rebunar") {
            returnToRebunar()
        }, LinearLayout.LayoutParams(0, dp(46), 1f))
        browserTabsButton = Button(this).apply {
            text = "▢  ${browserTabs.size}"
            isAllCaps = false
            textSize = 10f
            setTextColor(Color.rgb(220, 214, 235))
            setBackgroundColor(Color.TRANSPARENT)
            minWidth = 0
            minimumWidth = 0
            setPadding(0, 0, 0, 0)
            contentDescription = "Открытые вкладки"
            setOnClickListener { showBrowserTabs() }
        }
        val tabsAction = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            addView(TextView(this@MainActivity).apply {
                text = "▢"
                textSize = 22f
                gravity = Gravity.CENTER
                setTextColor(Color.rgb(202, 165, 255))
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(25)))
            addView(TextView(this@MainActivity).apply {
                text = "Вкладки"
                textSize = 10f
                gravity = Gravity.CENTER
                setTextColor(Color.rgb(220, 214, 235))
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(15)))
            isClickable = true
            isFocusable = true
            contentDescription = "Открытые вкладки"
            setOnClickListener { showBrowserTabs() }
        }
        bottomBar.addView(tabsAction, LinearLayout.LayoutParams(0, dp(46), 1f))
        bottomBar.addView(bottomAction("⟳", "Обновить", "Обновить страницу") {
            if (::browserWebView.isInitialized) browserWebView.reload()
        }, LinearLayout.LayoutParams(0, dp(46), 1f))

        panel.addView(browserAddress, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(42)
        ).apply {
            setMargins(dp(10), dp(6), dp(10), dp(4))
        })
        panel.addView(browserContent, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        panel.addView(bottomBar, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(50)
        ))
        return panel
    }

    private fun normalizeBrowserAddress(raw: String): String {
        val value = raw.trim()
        if (value.isBlank()) return ""
        val candidate = if (value.contains("://")) value else "https://$value"
        val uri = runCatching { Uri.parse(candidate) }.getOrNull() ?: return ""
        if ((uri.scheme != "https" && uri.scheme != "http") || uri.host.isNullOrBlank()) return ""
        return uri.toString()
    }

    private fun loadBrowserAddress() {
        val address = normalizeBrowserAddress(browserAddress.text.toString())
        if (address.isBlank()) {
            browserAddress.error = "Введи корректный адрес сайта"
            return
        }
        browserAddress.clearFocus()
        val keyboard = getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
        keyboard.hideSoftInputFromWindow(browserAddress.windowToken, 0)
        browserWebView.loadUrl(address)
    }

    private fun createBrowserTab(rawUrl: String, activate: Boolean): WebView {
        val view = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 9, 10))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.setSupportMultipleWindows(true)
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.safeBrowsingEnabled = true
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true)
        val tab = BrowserTab(nextBrowserTabId++, view, "Новая вкладка", rawUrl)
        browserTabs.add(tab)
        browserContent.addView(view, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ))
        view.visibility = View.GONE

        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(webView: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                // Keep all normal web navigation in this tab. Block unsupported external schemes.
                return uri.scheme != "https" && uri.scheme != "http"
            }
            override fun onPageStarted(webView: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                tab.url = url.orEmpty()
                if (activeBrowserTabId == tab.id) updateBrowserToolbar(tab)
            }
            override fun onPageFinished(webView: WebView?, url: String?) {
                tab.url = url.orEmpty()
                tab.title = webView?.title?.takeIf { it.isNotBlank() } ?: Uri.parse(tab.url).host.orEmpty()
                if (activeBrowserTabId == tab.id) updateBrowserToolbar(tab)
                CookieManager.getInstance().flush()
            }
            override fun onReceivedSslError(webView: WebView?, handler: SslErrorHandler?, error: android.net.http.SslError?) {
                handler?.cancel()
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                source: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                if (!isUserGesture || resultMsg == null) return false
                val newView = createBrowserTab("about:blank", true)
                val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
                transport.webView = newView
                resultMsg.sendToTarget()
                return true
            }
            override fun onCloseWindow(window: WebView?) {
                val closing = browserTabs.firstOrNull { it.view === window } ?: return
                closeBrowserTab(closing.id)
            }
        }
        if (activate) activateBrowserTab(tab.id)
        if (rawUrl.isNotBlank() && rawUrl != "about:blank") view.loadUrl(rawUrl)
        return view
    }

    private fun activateBrowserTab(id: Int) {
        val tab = browserTabs.firstOrNull { it.id == id } ?: return
        activeBrowserTabId = id
        browserTabs.forEach { it.view.visibility = if (it.id == id) View.VISIBLE else View.GONE }
        browserWebView = tab.view
        updateBrowserToolbar(tab)
        browserPanel.visibility = View.VISIBLE
    }

    private fun updateBrowserToolbar(tab: BrowserTab) {
        if (!::browserAddress.isInitialized || activeBrowserTabId != tab.id) return
        if (!browserAddress.hasFocus()) browserAddress.setText(tab.url.takeUnless { it == "about:blank" } ?: "")
        browserAddress.setSelection(browserAddress.text.length)
        if (::browserTabsButton.isInitialized) {
            browserTabsButton.text = "▢  ${browserTabs.size}"
            browserTabsButton.contentDescription = "Открытые вкладки: ${browserTabs.size}"
        }
    }

    private fun showBrowserTabs() {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(8), dp(16), dp(8))
        }
        val dialog = AlertDialog.Builder(this)
            .setTitle("Вкладки Rebunar")
            .setView(content)
            .setNegativeButton("Готово", null)
            .create()

        val addTab = TextView(this).apply {
            text = "+  Новая вкладка"
            textSize = 16f
            setTextColor(Color.rgb(202, 165, 255))
            setPadding(dp(8), dp(14), dp(8), dp(14))
            isClickable = true
            setOnClickListener {
                createBrowserTab("about:blank", true)
                dialog.dismiss()
            }
        }
        content.addView(addTab)

        browserTabs.forEachIndexed { index, tab ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(8), dp(8), dp(4), dp(8))
            }
            val title = TextView(this).apply {
                text = "${index + 1}. ${tab.title.ifBlank { tab.url.ifBlank { "Новая вкладка" } }}"
                textSize = 14f
                setTextColor(Color.WHITE)
                maxLines = 2
                setOnClickListener {
                    activateBrowserTab(tab.id)
                    dialog.dismiss()
                }
            }
            row.addView(title, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(TextView(this).apply {
                text = "×"
                textSize = 24f
                gravity = Gravity.CENTER
                setTextColor(Color.LTGRAY)
                setPadding(dp(14), dp(2), dp(14), dp(2))
                contentDescription = "Закрыть вкладку"
                setOnClickListener {
                    closeBrowserTab(tab.id)
                    dialog.dismiss()
                    if (browserTabs.isNotEmpty()) showBrowserTabs()
                }
            })
            content.addView(row)
        }
        dialog.show()
    }

    private fun closeBrowserTab(id: Int) {
        val index = browserTabs.indexOfFirst { it.id == id }
        if (index < 0) return
        val wasActive = activeBrowserTabId == id
        val tab = browserTabs.removeAt(index)
        tab.view.stopLoading()
        browserContent.removeView(tab.view)
        tab.view.destroy()
        if (browserTabs.isEmpty()) {
            activeBrowserTabId = -1
            browserPanel.visibility = View.GONE
            return
        }
        if (wasActive) activateBrowserTab(browserTabs.getOrElse(index.coerceAtMost(browserTabs.lastIndex)) { browserTabs.last() }.id)
        else browserTabsButton.text = browserTabs.size.toString()
    }

    private fun openInternalBrowser(rawUrl: String, title: String) {
        val url = normalizeBrowserAddress(rawUrl)
        if (url.isBlank()) return
        val view = createBrowserTab(url, true)
        browserTabs.lastOrNull()?.let { tab ->
            if (tab.view === view && title.isNotBlank()) {
                tab.title = title
                updateBrowserToolbar(tab)
            }
        }
    }

    private fun returnToRebunar() {
        // Keep open pages alive so the user can return to them from the tabs list.
        browserPanel.visibility = View.GONE
    }

    private fun closeInternalBrowser() {
        returnToRebunar()
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
            returnToRebunar()
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
