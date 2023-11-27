const fs = require('fs-extra');
const path = require('path');

let nbFilesCopied = 0;

function copyFile(sourceDir, destinationDir, filename) {
    fs.ensureDirSync(destinationDir);
    //console.log(`Copying file ${filename} to ${destinationDir}`);
    fs.copyFileSync(path.join(sourceDir, filename), path.join(destinationDir, filename));
    nbFilesCopied++;
}

function copyFilesRecursive(sourceDir, destinationDir, allowedExtensions = null) {
    const childs = fs.readdirSync(sourceDir);
    childs.forEach((filename) => {
        const src = path.join(sourceDir, filename);
        const dest = path.join(destinationDir, filename);

        if (fs.statSync(src).isDirectory()) {
            copyFilesRecursive(src, dest, allowedExtensions);
        } else {
            const extension = path.extname(filename).toLowerCase();
            if (allowedExtensions === null || allowedExtensions.includes(extension)) {
                copyFile(sourceDir, destinationDir, filename);
            }
        } 
    });
};

function findFilesRecursive(sourceDir, allowedExtensions, fileList = []) {
    const childs = fs.readdirSync(sourceDir);

    childs.forEach((filename) => {
        const src = path.join(sourceDir, filename);

        if (fs.statSync(src).isDirectory()) {
            findFilesRecursive(src, allowedExtensions, fileList);
        } else {
            const extension = path.extname(filename).toLowerCase();
            if (allowedExtensions.includes(extension)) {
                fileList.push(src);
            }
        }
    });

    return fileList;
}

const sourceDir = path.join(__dirname, '..', 'src');
const staticDir = path.join(sourceDir, 'static');
const libDir = path.join(staticDir, 'lib');
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

console.log('Preparing static assets...');

// Copy components static files
let src = path.join(sourceDir, 'components');
let dst = path.join(staticDir, 'components');
fs.removeSync(dst);
copyFilesRecursive(src, dst, ['.png', '.jpg', '.jpeg', '.webp']);

// OpenLayers
src = path.join(nodeModulesDir, 'ol');
dst = path.join(libDir, 'openlayers');
fs.removeSync(dst);
copyFile(src, dst, 'ol.css');

// Vanilla Picker
src = path.join(nodeModulesDir, 'vanilla-picker', 'dist');
dst = path.join(libDir, 'vanilla-picker');
fs.removeSync(dst);
copyFile(src, dst, 'vanilla-picker.csp.css');

// Gridjs
src = path.join(nodeModulesDir, 'gridjs','dist','theme');
dst = path.join(libDir, 'gridjs');
fs.removeSync(dst);
copyFile(src, dst, 'mermaid.min.css');

// Tippy.js
src = path.join(nodeModulesDir, 'tippy.js');
dst = path.join(libDir, 'tippy.js');
const dstFile = path.join(dst, 'tippy.min.css');
fs.removeSync(dst);
fs.ensureDirSync(dst);
const fileList = findFilesRecursive(src, ['.css']);
for (let file of fileList) {
    //console.log(file);
    const content = fs.readFileSync(file, 'utf-8');
    fs.appendFileSync(dstFile, content);
    nbFilesCopied++;
}

// Cesium
src = path.join(nodeModulesDir, 'cesium','Build','Cesium');
dst = path.join(libDir, 'cesium');
fs.removeSync(dst);
copyFilesRecursive(src, dst);

// End
console.log(`${nbFilesCopied} files copied.`);