'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');
require('isomorphic-fetch');
const versiony = require('versiony');
const chalk = require('chalk');
const path = require('path');
const FormData = require("form-data")
const fs = require('fs-extra');
const webpack = require('webpack');
const config = require('../config/webpack.config.prod');
const paths = require('../config/paths');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const NwBuilder = require('nw-builder');
const FileSizeReporter = require('react-dev-utils/FileSizeReporter');
const printBuildError = require('react-dev-utils/printBuildError');
const { execSync } = require('child_process');
const spawnSync = require('react-dev-utils/crossSpawn').sync;
const appPackageJson = require(paths.appPackageJson);
const archiver = require('archiver');

const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;
const cyan = chalk.cyan;

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;
const resolveApp = relativePath => path.resolve(fs.realpathSync(process.cwd()), relativePath);

const actualizarServidor = true
let nuevaVersion = versiony.from('package.json').patch().get();
const nwjsVersion = appPackageJson.nwBuilder.version

const log = (tipo, m) => {
    m = typeof m === "object" ? JSON.stringify(m) : m
    if (tipo == 'info') {
      console.log(chalk.blue(tipo) + `\t ${m}`)
    }

    if (tipo == 'success') {
      console.log(chalk.green(tipo) + `\t ${m}`)
    }

    if (tipo == 'error') {
      console.log(chalk.red(tipo) + `\t ${m}`)
    }

    if (tipo == 'warning') {
      console.log(chalk.yellow(tipo) + `\t ${m}`)
    }
}

const updatePackageJson = async (revert) => {
    let manifestUrl = appPackageJson.manifestUrl

    execSync(`json -I -f ${paths.appPackageJson} -e 'this.version="${nuevaVersion}"'`)
    execSync(`json -I -f ${paths.appPackageJson} -e 'this.window.title="Admintotal v${nuevaVersion}"'`)
    
    if (!revert) {
      execSync(`json -I -f ${paths.appPackageJson} -e 'this.env="production"'`)
      execSync(`json -I -f ${paths.appPackageJson} -e 'this.manifestUrl="${manifestUrl.replace('http://localhost:8001', 'https://soporte.admintotal.com')}"'`)
    } else {
      execSync(`json -I -f ${paths.appPackageJson} -e 'this.env="development"'`)
      execSync(`json -I -f ${paths.appPackageJson} -e 'this.manifestUrl="${manifestUrl.replace('https://soporte.admintotal.com', 'http://localhost:8001')}"'`)
    }

}

const copiarPrecompilados = async (platform) => {
    let dest = `${paths.appBuild}/Admintotal/${platform}/package.nw/node_modules`
    let prebuilds = appPackageJson.prebuilds[platform]
    if (prebuilds && Object.keys(prebuilds).length) {
        for(let pkg in prebuilds) {
            log('info', `Copiando pre-compilado de ${pkg} en ${dest}`)
            execSync(`rm -rf ${dest}/${pkg}`)
            execSync(`cp -r ${prebuilds[pkg]} ${dest}`)
        }

        return true
    }

    return false
}

const generarInstaladorWindows = async (platform) => {
    log('info', `Generando instalador para ${platform}`)
    let homedir = require('os').homedir();
    let winePrefix = `${homedir}/.wine`

    execSync(`mkdir -p ${winePrefix}/drive_c/at-builds/`)
    execSync(`rm -rf ${winePrefix}/drive_c/at-builds/${platform}`)
    execSync(`rsync -av --progress ${paths.appBuild}/Admintotal/${platform} ${winePrefix}/drive_c/at-builds/ `)

    execSync(`sed -i -e 's/__PLATFORM__/${platform}/g' ${paths.appScripts}/inno-setup.iss`, {stdio:[0,1,2]})
    execSync(`sed -i -e 's/__VERSION__/${nuevaVersion}/g' ${paths.appScripts}/inno-setup.iss`, {stdio:[0,1,2]})

    let exeFileName = `at-install-${platform}-v${nuevaVersion}.exe`
    let remotePath = `/srv/www/media/site_media_central/at-desktop/${exeFileName}`
    let localPath = `${winePrefix}/drive_c/at-builds/${platform}/installers/admintotal-install.exe`
    
    log('info', 'Generando instalador para Windows')
    // execSync(`./iscc.sh "./inno-setup.iss"`, {stdio:[0,1,2], cwd: paths.appScripts})
    execSync(`WINEPREFIX=${winePrefix} wine "C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe" $(winepath -w "./inno-setup.iss") `, {stdio:[0,1,2], cwd: paths.appScripts})

    execSync(`sed -i -e 's/${platform}/__PLATFORM__/g' ${paths.appScripts}/inno-setup.iss`, {stdio:[0,1,2]})
    execSync(`sed -i -e 's/${nuevaVersion}/__VERSION__/g' ${paths.appScripts}/inno-setup.iss`, {stdio:[0,1,2]})
    
    return {
        path: localPath,
        filename: exeFileName
    }
}

const comprimir = async (dirPath, outputPath) => {
    let remotePath = `/srv/www/media/site_media_central/at-desktop/updates/latest`

    log('info', `Comprimiendo ${dirPath} en ${outputPath}`)
    execSync(`zip -r ../${outputPath} ./*`, {cwd: dirPath})

    return `${paths.appBuild}/Admintotal/${outputPath}`
}

const registrarActualizacion = async (data) => {
  let url = 'https://soporte.admintotal.com/central/api/v1/at-desktop-build/'
  let formd = new FormData()
  
  formd.append("version", data.version)
  formd.append("descripcion", data.descripcion)

  if (data.instalador_linux) {
    formd.append("instalador_linux", fs.createReadStream(data.instalador_linux))
  }
  
  if(data.instalador_macos) {
    formd.append("instalador_macos", fs.createReadStream(data.instalador_macos))
  }
  
  if(data.instalador_windows) {
    formd.append("instalador_windows", fs.createReadStream(data.instalador_windows))
  }

  let options = {
      method: 'POST',
      body: formd,
  };

  formd.submit(url, (err, res, body) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // Consume response data to free up memory
      res.resume();
      return;
    }
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        console.log(parsedData);
      } catch (e) {
        console.error(e.message);
      }
    });
  }, (err) => {
        console.log('error', err)
  });
}

const prepararBackend = async (platform) => {
  let isUnix = !platform.startsWith('win')
  let nwjc = `${paths.appCache}/${nwjsVersion}-sdk/${platform}/nwjc`
  let cmd = `${nwjc} ${paths.appServer}/dist/backend.js ${paths.appBuild}/Admintotal/${platform}/package.nw/server/backend.bin`

  fs.ensureDirSync(`${paths.appBuild}/Admintotal/${platform}/package.nw/server`)
  fs.ensureDirSync(`${paths.appBuild}/Admintotal/${platform}/package.nw/public`)
  
  fs.copySync(`${paths.appServer}/views`, `${paths.appBuild}/Admintotal/${platform}/package.nw/server/views`)
  fs.copySync(`${paths.appServer}/static`, `${paths.appBuild}/Admintotal/${platform}/package.nw/server/static`)
  fs.copySync(`${paths.appPublic}/bootstrap`, `${paths.appBuild}/Admintotal/${platform}/package.nw/public/bootstrap`)
  fs.copySync(
    `${paths.appServer}/lib`, 
    `${paths.appBuild}/Admintotal/${platform}/package.nw/server/lib`, 
    {
      filter: (src, dest) => {
        return dest.indexOf('.js') === -1
      }
    }
  )

  if (! isUnix ) {
    nwjc = `wine $(winepath -w ${paths.appCache}/${nwjsVersion}-sdk/${platform}/nwjc.exe)`
    cmd = `${nwjc} $(winepath -w ${paths.appServer}/dist/backend.js) $(winepath -w ${paths.appBuild}/Admintotal/${platform}/package.nw/server/backend.bin)`
  }

  execSync(cmd)
}

const customBuild = async () => {
    let buildInfo = {
      version: nuevaVersion, 
      descripcion: '---', 
      packages: {}
    }
    execSync(`npx webpack --config ${paths.appServer}/webpack.config.js`)

    let proms = appPackageJson.nwBuilder.platforms.map(async (platform) => {
        log('info', `Build for ${platform}`)
        log('info', `--------------------------------------------`)
        try {
            let isUnix = !platform.startsWith('win')
            execSync(`mkdir -p ${paths.appBuild}/Admintotal/${platform}/package.nw`)
            execSync(`rsync -av --progress ${paths.appCache}/${nwjsVersion}-normal/${platform} ${paths.appBuild}/Admintotal`)
            execSync(`rsync -av --progress ${paths.appBuild}/* ${paths.appBuild}/Admintotal/${platform}/package.nw --exclude Admintotal`)
            
            await copiarPrecompilados(platform)
            execSync(`cp ${paths.appScripts}/${platform}/* ${paths.appBuild}/Admintotal/${platform}`, {stdio:[0,1,2]})
            // rm locales
            execSync(`find ${paths.appBuild}/Admintotal/${platform}/locales -type f -not -name 'es*' -not -name 'en*' -print0 | xargs -0 rm --`, {stdio:[0,1,2]})

            await prepararBackend(platform)
            if (isUnix) {
                execSync(`mv ${paths.appBuild}/Admintotal/${platform}/nw ${paths.appBuild}/Admintotal/${platform}/Admintotal`)
            } else {
                execSync(`mv ${paths.appBuild}/Admintotal/${platform}/nw.exe ${paths.appBuild}/Admintotal/${platform}/Admintotal.exe`)
            }
            
            let zipFileName = `admintotal-${platform}.zip`
            let zipPath = await comprimir(`${paths.appBuild}/Admintotal/${platform}`, zipFileName)
            let remoteBaseUrl = `https://soporte.admintotal.com/site_media_central/at-desktop/updates/latest`

            buildInfo.instalador_linux = zipPath
            
            if (!isUnix) {
                let info = await generarInstaladorWindows(platform)
                buildInfo.instalador_windows = info.path
            }
    
            return {status: 'success', platform: platform}
        } 
        catch(err) {
            log('error', {status: 'error', platform: platform, message: err.message})
            return {status: 'error', platform: platform, message: err.message}
        }
    })

    Promise.all(proms).then(async (data) => {
        if (actualizarServidor) {
          await registrarActualizacion(buildInfo)
        }
        
        return buildInfo
    })
    
}

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
}

// First, read the current file sizes in build directory.
// This lets us display how much they changed later.
measureFileSizesBeforeBuild(paths.appBuild)
  .then(async previousFileSizes => {
    await updatePackageJson();
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild);
    // Copy the package.json
    fs.copySync(paths.appPackageJson, `${paths.appBuild}/package.json`);
    
    // Merge with the public folder
    copyPublicFolder();
    // Start the webpack build
    return build(previousFileSizes);
  })
  .then(
    async ({ stats, previousFileSizes, warnings }) => {

    if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(warnings.join('\n\n'));
        console.log(
          '\nSearch for the ' +
            chalk.underline(chalk.yellow('keywords')) +
            ' to learn more about each warning.'
        );
        console.log(
          'To ignore, add ' +
            chalk.cyan('// eslint-disable-next-line') +
            ' to the line before.\n'
        );
    } else {
        console.log(chalk.green('Compiled successfully.\n'));
    }

    console.log('File sizes after gzip:\n');
    printFileSizesAfterBuild(
        stats,
        previousFileSizes,
        paths.appBuild,
        WARN_AFTER_BUNDLE_GZIP_SIZE,
        WARN_AFTER_CHUNK_GZIP_SIZE
    );

    console.log();

    // Build the app
    console.log(cyan('Running npm install...'));
    spawnSync('npm', ['install', '--loglevel', 'error'], {
      stdio: 'inherit',
      cwd: paths.appBuild,
    });
    
      

    await customBuild()
    await updatePackageJson(true);
    return

    // const options = appPackageJson.nwBuilder;
    // options.files = `${paths.appBuild}/**/*`;
    // options.flavor = 'normal';
    /*
    const nw = new NwBuilder(options);
    nw.build().then(async () => {
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });*/

    }, async err => {
      console.log(chalk.red('Failed to compile.\n'));
      await updatePackageJson(true);
      printBuildError(err);
      process.exit(1);
    }
);

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
  console.log('Creating an optimized production build...');

  let compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      const messages = formatWebpackMessages(stats.toJson({}, true));
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join('\n\n')));
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' ||
          process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n'
          )
        );
        return reject(new Error(messages.warnings.join('\n\n')));
      }
      return resolve({
        stats,
        previousFileSizes,
        warnings: messages.warnings,
      });
    });
  });
}

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
  });
}
