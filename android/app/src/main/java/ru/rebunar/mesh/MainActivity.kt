package ru.rebunar.mesh

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.ParcelUuid
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.UUID

/**
 * Discovery-only proof of concept.
 * No messages, user IDs, contacts, files or chat content are transmitted.
 */
class MainActivity : Activity() {
    companion object {
        private val MESH_SERVICE = ParcelUuid(
            UUID.fromString("8b7d4a10-6c2f-4f91-9a31-5e7c2d0b6101")
        )
        private const val REQUEST_PERMISSIONS = 410
    }

    private lateinit var status: TextView
    private lateinit var count: TextView
    private lateinit var toggle: Button
    private var adapter: BluetoothAdapter? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var scanner: BluetoothLeScanner? = null
    private var isRunning = false
    private val seenDevices = mutableSetOf<String>()

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            runOnUiThread { status.text = "Режим обнаружения включён" }
        }
        override fun onStartFailure(errorCode: Int) {
            runOnUiThread {
                status.text = "Не удалось включить BLE-рекламу (код $errorCode)"
                stopMesh()
            }
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            // Address is RAM-only for deduplication; never displayed or persisted.
            synchronized(seenDevices) {
                seenDevices.add(result.device.address)
                val total = seenDevices.size
                runOnUiThread { count.text = "Устройств Rebunar Mesh рядом: $total" }
            }
        }
        override fun onScanFailed(errorCode: Int) {
            runOnUiThread { status.text = "Ошибка поиска BLE (код $errorCode)" }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val manager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        adapter = manager.adapter

        status = TextView(this).apply {
            text = "Mesh выключен"; textSize = 18f; gravity = Gravity.CENTER
        }
        count = TextView(this).apply {
            text = "Устройств Rebunar Mesh рядом: 0"; textSize = 16f; gravity = Gravity.CENTER
        }
        toggle = Button(this).apply {
            text = "Включить обнаружение"
            setOnClickListener { if (isRunning) stopMesh() else ensurePermissionsAndStart() }
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(28, 28, 28, 28)
            addView(status)
            addView(count)
            addView(toggle)
            addView(TextView(this@MainActivity).apply {
                text = "Тест обнаруживает соседние устройства. Сообщения пока не передаются."
                textSize = 13f; gravity = Gravity.CENTER; setPadding(0, 24, 0, 0)
            })
        }
        setContentView(layout)
    }

    private fun requiredPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            )
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }

    private fun ensurePermissionsAndStart() {
        val missing = requiredPermissions().filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) requestPermissions(missing.toTypedArray(), REQUEST_PERMISSIONS)
        else startMesh()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.isNotEmpty() && grantResults.all {
                    it == PackageManager.PERMISSION_GRANTED
                }) startMesh()
            else status.text = "Без разрешений Bluetooth обнаружение невозможно"
        }
    }

    private fun startMesh() {
        val bluetooth = adapter
        if (bluetooth == null || !bluetooth.isEnabled) {
            status.text = "Сначала включи Bluetooth в настройках телефона"; return
        }
        if (!bluetooth.isMultipleAdvertisementSupported) {
            status.text = "Телефон не поддерживает BLE-рекламу"; return
        }
        advertiser = bluetooth.bluetoothLeAdvertiser
        scanner = bluetooth.bluetoothLeScanner
        if (advertiser == null || scanner == null) {
            status.text = "BLE-реклама или сканирование недоступны"; return
        }

        val advertiseSettings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_LOW)
            .setConnectable(false)
            .build()
        val advertiseData = AdvertiseData.Builder()
            .addServiceUuid(MESH_SERVICE)
            .setIncludeDeviceName(false)
            .build()
        val filter = ScanFilter.Builder().setServiceUuid(MESH_SERVICE).build()
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER).build()

        try {
            seenDevices.clear()
            count.text = "Устройств Rebunar Mesh рядом: 0"
            advertiser?.startAdvertising(advertiseSettings, advertiseData, advertiseCallback)
            scanner?.startScan(listOf(filter), scanSettings, scanCallback)
            isRunning = true
            toggle.text = "Выключить обнаружение"
            status.text = "Запускаем обнаружение…"
        } catch (security: SecurityException) {
            status.text = "Нет разрешения Bluetooth: ${security.message}"
            stopMesh()
        } catch (error: Exception) {
            status.text = "Ошибка запуска: ${error.message}"
            stopMesh()
        }
    }

    private fun stopMesh() {
        try { scanner?.stopScan(scanCallback) } catch (_: Exception) {}
        try { advertiser?.stopAdvertising(advertiseCallback) } catch (_: Exception) {}
        isRunning = false
        toggle.text = "Включить обнаружение"
        status.text = "Mesh выключен"
    }

    override fun onDestroy() {
        stopMesh()
        super.onDestroy()
    }
}
