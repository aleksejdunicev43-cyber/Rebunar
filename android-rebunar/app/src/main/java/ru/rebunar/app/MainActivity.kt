package ru.rebunar.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
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
import java.io.FileNotFoundException
import java.util.Locale

class MainActivity : Activity() {
    companion object {
        private const val APP_URL = "https://rebunar.pythonanywhere.com/new"
        private const val APP_HOST = "rebunar.pythonanywhere.com"
        private const val FILE_PICKER_REQUEST = 4102
    }

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private var filePathCallback: android.webkit.ValueCallback<Array<Uri>>? = null
    private var hasEnteredForeground = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8, 9, 10)
        window.navigationBarColor = Color.rgb(8, 9, 10)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        buildScreen()
        configureWebView()

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
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
        if (!hasEnteredForeground) {
            hasEnteredForeground = true
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
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
