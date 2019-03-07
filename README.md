# POS Desktop


## Instalar nodejs
[NVM para Linux](https://github.com/creationix/nvm)

[NVM para Windows](https://github.com/coreybutler/nvm-windows)

```bash
nvm install 10.6.0
nvm alias default 10.6.0
```

## Clonar proyecto

```bash
git clone https://github.com/admintotal/POS.git; cd POS
npm install
```

## Dev


```bash
npm start
# en otro tab de la terminal corremos nuestro servidor de express
npm run server
```

## Build

```bash
npm run build
```

```bat
################################
# Inno Setup 5.5.3
################################
wget http://files.jrsoftware.org/is/5/isetup-5.5.3.exe

env WINEPREFIX=$HOME/.wine winecfg
env WINEPREFIX=$HOME/.wine winetricks dotnet40 corefonts
env WINEPREFIX=$HOME/.wine winetricks gdiplus

WINEPREFIX=$HOME/.wine \
  wine ~/.wine/drive_c/Program\ Files\ \(x86\)/Resource\ Hacker/ResourceHacker.exe \
  -addoverwrite "C:\\Program\ Files\ \(x86\)\\Admintotal\\Admintotal.exe", \
  "C:\\Program\ Files\ \(x86\)\\Admintotal\\Admintotal.exe", \
  "C:\\Program\ Files\ \(x86\)\\Admintotal\\package.nw\\admintotal.ico", ICONGROUP, MAINICON, 0

WINEPREFIX=$HOME/.wine wine "C:\\Program\ Files\ \(x86\)\\Admintotal\\Admintotal.exe"

################################
# Build C++ add-ons
################################
# windows-build-tools debemos de instalarlo desde una power shell ejecutada
# como administrador, este paquete se encarga de instalar Python 2.7 y MSBuild Tools
npm install --global --production windows-build-tools

# instalamos nw-gyp
npm i -g nw-gyp


# Win32
set VCTargetsPath=C:\Program Files\MSBuild\Microsoft.Cpp\v4.0\v140\
# Win64
set VCTargetsPath=C:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\v140\

# win 10
cd module_to_build
nw-gyp configure --target=0.31.5
nw-gyp build --target=0.31.5 --msvs_version=2015

# win 7 
nw-gyp configure --target=0.31.5 --msvs_version=2015
nw-gyp build --target=0.31.5 --msvs_version=2015
```

### Build settings

package.json

```js
{
  //...
  // See https://github.com/nwjs-community/nw-builder
  "nwBuilder": {
    "platforms": [
      "osx64",
      "win32",
      "win64"
    ],
    "version": "0.31.5", // 0.24.4, 0.25.0 etc.
    "buildDir": "./build",
    "cacheDir": "./cache"
  }
}
```
