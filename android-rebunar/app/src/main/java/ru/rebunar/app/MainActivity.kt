package ru.rebunar.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.SafeBrowsingResponse
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : Activity() {
    companion object {
        private const val APP_URL = "https://rebunar.pythonanywhere.com/new"
        private const val APP_HOST = "rebunar.pythonanywhere.com"
        private const val FILE_PICKER_REQUEST = 4102
    }

    private lateinit var webView: WebView
    private lateinit var refreshLayout: SwipeRefreshLayout
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private var filePathCallback: android.webkit.ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8, 9, 10)
        window.navigationBarColor = Color.rgb(8, 9, 10)
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

        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(8), dp(12), dp(8))
            setBackgroundColor(Color.rgb(12, 13, 15))
        }

        val title = TextView(this).apply {
            text = "REBUNAR"
            textSize = 18f
            setTextColor(Color.WHITE)
            letterSpacing = 0.12f
        }
        toolbar.addView(title, LinearLayout.LayoutParams(0, dp(44), 1f))

        val refreshButton = Button(this).apply {
            text = "Обновить"
            isAllCaps = false
            setOnClickListener { refreshPage() }
        }
        toolbar.addView(refreshButton)

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            visibility = View.GONE
        }

        webView = WebView(this)

        refreshLayout = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(Color.rgb(190, 35, 48))
            setOnRefreshListener { refreshPage() }
            addView(webView, ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ))
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
        content.addView(refreshLayout, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        content.addView(errorPanel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        root.addView(toolbar)
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
                refreshLayout.isRefreshing = false
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

    private fun refreshPage() {
        errorPanel.visibility = View.GONE
        refreshLayout.isRefreshing = true
        if (webView.url.isNullOrBlank()) webView.loadUrl(APP_URL) else webView.reload()
    }

    private fun showConnectionError() {
        progress.visibility = View.GONE
        refreshLayout.isRefreshing = false
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
        if (::webView.isInitialized && webView.url != null) webView.reload()
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
