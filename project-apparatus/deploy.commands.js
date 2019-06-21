const gulp = require('gulp');
const fs = require('fs');
const util = require('util');
const GulpSSH = require('gulp-ssh');
const exec = util.promisify(require('child_process').exec);
const ts = require("gulp-typescript");
const sourcemaps = require('gulp-sourcemaps');

const consoleUtil = require('./console.util.js');

const settings = require('./private/private.config.js');
let pckg = require('./../package.json');

var main = {};

main.sendFileToDeployServer = async function () {

    consoleUtil.printHeader('Sending file to deploy server ...');

    const { stdout, stderr } = await exec(`.\\pscp.exe -P ${settings.port} -l ${settings.user} -i ${settings.priPath} ./release/dowproreplayswatcherapi_${pckg.version}.zip ${settings.user}@${settings.srvAddress}:${settings.destPath}`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    console.log('Done.');
};

main.build = async function () {
    consoleUtil.printHeader('Building solution ...');

    let tsProject = ts.createProject('./tsconfig.json');
    let reporter = ts.reporter.fullReporter();
    let tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject(reporter));

    return new Promise((resolve, reject) => {
        tsResult.js
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest("./dist/js"))
            .on('error', reject)
            .on('end', resolve);
    }).then(function () {
        console.log("Done.");
    });
};

main.deploy = function () {

    consoleUtil.printHeader('Deploying ...');

    let gulpSSH = new GulpSSH({
        ignoreErrors: false,
        sshConfig: {
            host: settings.srvAddress,
            port: settings.port,
            username: settings.user,
            privateKey: fs.readFileSync(settings.priPath)
        }
    });

    return gulpSSH
        .shell([`sudo ${settings.deployScriptPath}`], { filePath: `${pckg.version}_deploy.log` })
        .on('ssh2Data', function (data) {
            process.stdout.write(data.toString());
        });
};

module.exports = main;