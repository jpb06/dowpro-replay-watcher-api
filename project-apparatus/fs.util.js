const fs = require('fs-extra');

const consoleUtil = require('./console.util.js');

var main = {};

main.cleanDist = async function () {
    consoleUtil.printHeader('Cleaning dist folder ...');

    await fs.emptyDir('./dist');

    console.log('Done.');
};

main.createFolders = async function () {
    await fs.mkdir('./dist/js/temp');
}

main.createFoldersForProd = async function () {
    await fs.mkdir('./dist/temp');
}

main.generatePackage = async function () {
    consoleUtil.printHeader('Generating package.json file ...');

    const package = JSON.parse(fs.readFileSync('./package.json').toString());

    let distPackage = {
        name: package.name,
        version: package.version,
        description: package.version,
        main: package.main,
        types: package.types,
        author: package.author,
        dependencies: package.dependencies
    };

    await fs.writeFile('./dist/package.json', JSON.stringify(distPackage, null, 2), 'utf8');

    console.log('Done.');
}

main.useDevConfig = async function () {
    await fs.copy('./src/config/dev.config.json', './dist/js/config/current.config.json');
};

main.useProdConfig = async function () {
    await fs.copy('./src/config/prod.config.json', './dist/js/config/current.config.json');
};

module.exports = main;
