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
nw-gyp build --msvs_version=2015 --target=0.31.5

# win 7 (No se por que :s)
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
