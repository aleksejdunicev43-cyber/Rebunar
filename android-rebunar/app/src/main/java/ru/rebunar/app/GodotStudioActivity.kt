package ru.rebunar.app

import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.FragmentActivity
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotFragment
import org.godotengine.godot.GodotHost
import org.godotengine.godot.plugin.GodotPlugin

/**
 * First native Godot workspace inside Rebunar.
 *
 * This hosts the Godot runtime in the same APK. The visual project editor
 * remains a Rebunar feature and will be connected to this runtime in later steps.
 */
class GodotStudioActivity : FragmentActivity(), GodotHost {
    private var godotFragment: GodotFragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        window.statusBarColor = Color.rgb(7, 12, 11)
        window.navigationBarColor = Color.rgb(7, 12, 11)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(7, 12, 11))
        }

        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(6), dp(12), dp(6))
            setBackgroundColor(Color.rgb(10, 20, 18))
        }

        val backButton = Button(this).apply {
            text = "← Назад"
            isAllCaps = false
            setOnClickListener { finish() }
        }
        toolbar.addView(backButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            dp(42)
        ))

        val title = TextView(this).apply {
            text = "REBUNAR  /  GODOT ENGINE"
            textSize = 12f
            setTextColor(Color.rgb(95, 235, 170))
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), 0, 0, 0)
        }
        toolbar.addView(title, LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1f
        ))

        val status = TextView(this).apply {
            text = "ВСТРОЕННЫЙ ДВИЖОК"
            textSize = 9f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER_VERTICAL
        }
        toolbar.addView(status)

        val fragmentContainer = FrameLayout(this).apply {
            id = R.id.godot_fragment_container
            setBackgroundColor(Color.rgb(7, 12, 11))
        }

        root.addView(toolbar, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        root.addView(fragmentContainer, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ))
        setContentView(root)

        val restored = supportFragmentManager.findFragmentById(R.id.godot_fragment_container)
        godotFragment = restored as? GodotFragment
        if (godotFragment == null) {
            godotFragment = GodotFragment()
            supportFragmentManager.beginTransaction()
                .replace(R.id.godot_fragment_container, godotFragment!!)
                .commitNow()
        }
    }

    override fun getActivity() = this

    override fun getGodot() = godotFragment?.godot

    override fun getHostPlugins(godot: Godot): Set<GodotPlugin> = emptySet()

    @Deprecated("Use the system back dispatcher")
    override fun onBackPressed() {
        finish()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
