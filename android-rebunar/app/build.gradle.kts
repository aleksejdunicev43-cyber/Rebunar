plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.rebunar.app"
    compileSdk = 35

    // Keep Godot's project metadata directories when packaging Android assets.
    androidResources {
        ignoreAssetsPattern = "!.svn:!.git:!.gitignore:!.ds_store:!*.scc:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~"
    }

    defaultConfig {
        applicationId = "ru.rebunar.app"
        minSdk = 24
        // Support both 64-bit and 32-bit ARM Android phones.
        // Godot publishes native libraries for both ARM ABIs in its Android AAR.
        ndk {
            abiFilters += setOf("arm64-v8a", "armeabi-v7a")
        }
        targetSdk = 35
        versionCode = 2
        versionName = "0.1.3"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // Godot 4.7.2 runtime embedded directly in the Rebunar Android application.
    implementation("org.godotengine:godot:4.7.2.stable")
    implementation("androidx.fragment:fragment:1.9.1")
    implementation("androidx.core:core-splashscreen:1.2.0")
}
