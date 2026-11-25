#!/usr/bin/env bash
set +e
mkdir -p test-results/android

echo "Installing Rebunar APK"
adb install -r android-rebunar/app/build/outputs/apk/debug/app-debug.apk
install_status=$?
echo "$install_status" > test-results/android/install-exit-code.txt
if [ "$install_status" -ne 0 ]; then
  adb logcat -d -t 5000 > test-results/android/logcat.txt 2>&1
  exit "$install_status"
fi

adb logcat -c
adb shell am force-stop ru.rebunar.app
adb shell monkey -p ru.rebunar.app 1
launch_status=$?
echo "$launch_status" > test-results/android/launch-exit-code.txt
sleep 25

# Enable Chrome DevTools Protocol for this CI-only debug APK.
app_pid=$(adb shell pidof -s ru.rebunar.app | tr -d '\r')
echo "$app_pid" > test-results/android/app-pid.txt
if [ -n "$app_pid" ]; then
  adb forward tcp:9222 "localabstract:webview_devtools_remote_$app_pid"
  forward_status=$?
  echo "$forward_status" > test-results/android/devtools-forward-exit-code.txt
else
  echo "App PID not found" > test-results/android/devtools-error.txt
  forward_status=1
fi

if [ "$forward_status" -eq 0 ]; then
  ready=0
  for attempt in $(seq 1 30); do
    if curl --silent --fail http://127.0.0.1:9222/json/version > test-results/android/devtools-version.json; then
      ready=1
      break
    fi
    sleep 2
  done
  echo "$ready" > test-results/android/devtools-ready.txt
  if [ "$ready" -eq 1 ]; then
    timeout 90s node .github/scripts/android-webview-ui-smoke.mjs > test-results/android/webview-test-output.txt 2>&1
    ui_test_status=$?
  else
    echo "WebView DevTools endpoint did not become ready" > test-results/android/devtools-error.txt
    ui_test_status=1
  fi
else
  ui_test_status=1
fi
echo "$ui_test_status" > test-results/android/webview-test-exit-code.txt

# Keep native screenshot and hierarchy even when the browser test fails.
timeout 30s adb exec-out screencap -p > test-results/android/rebunar-screen.png 2> test-results/android/screencap-error.txt
echo "$?" > test-results/android/screencap-exit-code.txt

timeout 30s adb shell uiautomator dump /sdcard/rebunar-window.xml > test-results/android/uiautomator-output.txt 2>&1
if [ "$?" -eq 0 ]; then
  timeout 20s adb exec-out cat /sdcard/rebunar-window.xml > test-results/android/window.xml
fi

adb logcat -d -t 10000 > test-results/android/logcat.txt 2>&1
adb shell pidof ru.rebunar.app > test-results/android/app-pid-final.txt 2>&1
pid_status=$?
echo "$pid_status" > test-results/android/app-pid-exit-code.txt

echo "Emulator diagnostics:"
ls -lah test-results/android
if [ "$pid_status" -ne 0 ] || [ ! -s test-results/android/app-pid-final.txt ]; then
  echo "Rebunar process is not running after launch."
  exit 1
fi
if [ "$launch_status" -ne 0 ]; then
  echo "Android launch command returned a non-zero exit code."
  exit "$launch_status"
fi
if [ "$ui_test_status" -ne 0 ]; then
  echo "Android WebView UI test failed; inspect the uploaded diagnostics."
  exit "$ui_test_status"
fi
