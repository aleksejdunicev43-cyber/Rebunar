plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.rebunar.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "ru.rebunar.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 7
        versionName = "0.2.0"
    }

    signingConfigs {
        create("rebunarStable") {
            val keyStorePath = System.getenv("REBUNAR_KEYSTORE_PATH")
            if (!keyStorePath.isNullOrBlank()) {
                storeFile = file(keyStorePath)
                storePassword = System.getenv("REBUNAR_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("REBUNAR_KEY_ALIAS")
                keyPassword = System.getenv("REBUNAR_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            // CI debug builds use Android's standard debug key; release keeps the stable private key.
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("rebunarStable")
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
}
