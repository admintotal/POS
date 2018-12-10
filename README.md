# Admintotal desktop


## Instalar nodejs
[Descargar e instalar Node Js](https://nodejs.org/es/download/current/)

## Instalar dependencias del proyecto

```bash
npm i -g nodemon # usar sudo en caso de tener problemas con permisos
npm install
```

## Correr proyecto en dev mode

Será necesario quitar el atributo "node-main" de package.json

```bash
npm start
```
En otra terminar corremos el servidor de nuestra aplicación
```bash
nodemon server/app.js -e html,js
```

## Build
Es necesario agregar lo siguiente al ```package.json```  en caso de existir

```js
{
  //...
  "node-main": "./server/app.js"
  //...
}
```

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
nw-gyp configure --target=0.29.4
nw-gyp build --msvs_version=2015 --target=0.29.4

# win 7 (No se por que :s)
nw-gyp configure --target=0.29.4 --msvs_version=2015
nw-gyp build --target=0.29.4 --msvs_version=2015
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
    "version": "0.29.4", // 0.24.4, 0.25.0 etc.
    "buildDir": "./build",
    "cacheDir": "./cache"
  }
}
```
