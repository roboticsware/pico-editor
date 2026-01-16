# Pico-Editor

Pico Editor - Both Block and Text based Coding Editor in Web/PC hybrid environment for Raspberry Pi Pico with Blockly and Python support.

## Screenshots
![Main screen](./src/assets/screenshot_1.png)

## Web-based Demo
[https://pico-editor.vercel.com](https://pico-editor.vercel.com)

## Project Dev Env Setup
### Get souce codes
```sh
git clone https://github.com/roboticsware/pico-editor
cd pico-editor
```

### Install Dependancies
```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## Desktop Build (Electron)

This project supports multi-platform desktop versions using [Capacitor Electron](https://capacitor-community.github.io/electron/).

### 1. First-time Setup
Before building the desktop app for the first time, you must install dependencies in the electron directory:

```sh
# From the project root
cd electron
npm install
cd ..
```

### 2. Build and Run Desktop App (Dev Mode)

To build the project and open it in Electron:

```sh
# 1. Build web app and copy to electron folder
npm run electron:build

# 2. Launch the app
npm run electron:open
```

### 3. Creating Installers (Production)

To create a standalone installer (EXE, DMG, etc.), use the commands below. These commands will automatically build the web project, copy the assets, and then package them.

#### Windows (NSIS x64)
```sh
npm run electron:make:win
```

#### macOS (DMG)
```sh
npm run electron:make:mac
```

#### Linux (AppImage, deb)
```sh
npm run electron:make:linux
```

> **Note:** For Windows and Linux, it is recommended to run the build command on the respective target operating system for the best compatibility.

