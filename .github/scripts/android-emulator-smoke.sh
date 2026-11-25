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
sleep 35

timeout 30s adb exec-out screencap -p > test-results/android/rebunar-screen.png 2> test-results/android/screencap-error.txt
echo "$?" > test-results/android/screencap-exit-code.txt

timeout 30s adb shell uiautomator dump /sdcard/rebunar-window.xml > test-results/android/uiautomator-output.txt 2>&1
if [ "$?" -eq 0 ]; then
  timeout 20s adb pull /sdcard/rebunar-window.xml test-results/android/window.xml
fi

adb logcat -d -t 8000 > test-results/android/logcat.txt 2>&1
adb shell pidof ru.rebunar.app > test-results/android/app-pid.txt 2>&1
pid_status=$?
echo "$pid_status" > test-results/android/app-pid-exit-code.txt

echo "Emulator diagnostics:"
ls -lah test-results/android
if [ "$pid_status" -ne 0 ] || [ ! -s test-results/android/app-pid.txt ]; then
  echo "Rebunar process is not running after launch."
  exit 1
fi
if [ "$launch_status" -ne 0 ]; then
  echo "Android launch command returned a non-zero exit code."
  exit "$launch_status"
fi
