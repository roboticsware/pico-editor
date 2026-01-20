# Pico-Editor

Pico Editor - Both Block and Text based Coding Editor in Web/PC hybrid environment for Raspberry Pi Pico with Blockly and Python support.

## Screenshots
![Main screen](./src/assets/screenshot_1.png)

## Web-based Demo
[https://pico-editor-demo.vercel.app](https://pico-editor-demo.vercel.app)

## Project Dev Env Setup
### Get souce codes
```sh
git clone https://github.com/roboticsware/pico-editor
cd pico-editor
```

### Install Dependancies
```sh
yarn install
```

### Compile and Hot-Reload for Development

```sh
yarn dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn build
```

## Desktop Build (Electron)

This project supports multi-platform desktop versions using [Capacitor Electron](https://capacitor-community.github.io/electron/).

### 1. First-time Setup
Before building the desktop app for the first time, you must install dependencies in the electron directory:

```sh
# From the project root
cd electron
yarn install
cd ..
```

### 2. Build and Run Desktop App (Dev Mode)

To build the project and open it in Electron:

```sh
# 1. Build web app and copy to electron folder
yarn electron:build

# 2. Launch the app
yarn electron:open
```

### 3. Creating Installers (Production)

To create a standalone installer (EXE, DMG, etc.), use the commands below. These commands will automatically build the web project, copy the assets, and then package them.

#### Windows (NSIS x64)
```sh
yarn electron:make:win
```

#### macOS (DMG)
```sh
yarn electron:make:mac
```

#### Linux (AppImage, deb)
```sh
yarn electron:make:linux
```

> **Note:** For Windows and Linux, it is recommended to run the build command on the respective target operating system for the best compatibility.

## Android Build (Tablet)

This project supports Android tablet versions using [Capacitor Android](https://capacitorjs.com/docs/android).

### 1. Prerequisites

Before building for Android, ensure you have the following installed:
- [Android Studio](https://developer.android.com/studio) (latest version)
- Android SDK (API level 24 or higher)
- Java Development Kit (JDK) 17 or higher

### 2. Build and Run Android App (Dev Mode)

To build the project and open it in Android Studio:

```sh
# 1. Build web app and copy to android folder
yarn android:build

# 2. Open in Android Studio
yarn android:open
```

After opening in Android Studio, you can:
- Connect your Android tablet via USB (with USB debugging enabled)
- Use an Android emulator
- Click "Run" to install and launch the app

### 3. Run on Device Directly

To build and run directly on a connected device:

```sh
yarn android:run
```

> **Note:** Make sure USB debugging is enabled on your Android device and it's connected to your computer.

