const fs = require('fs');
const path = require('path');

const targetPath = './client/public/images';
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

function renameCellImages(basePath) {
    const items = fs.readdirSync(basePath);

    items.forEach(itemName => {
        const itemPath = path.join(basePath, itemName);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            console.log(`Folder: ${itemName}`);
            
            const files = fs.readdirSync(itemPath);
            let count = 1;

            files.forEach(filename => {
                const ext = path.extname(filename).toLowerCase();
                
                if (!validExtensions.includes(ext)) return;

                const oldFilePath = path.join(itemPath, filename);
                const newFilename = `${count}${ext}`;
                const newFilePath = path.join(itemPath, newFilename);

                try {
                    fs.renameSync(oldFilePath, newFilePath);
                    console.log(`  ${filename} -> ${newFilename}`);
                    count++;
                } catch (err) {
                    console.error(`  Error renaming ${filename}:`, err);
                }
            });
        }
    });
    console.log('\n Complete!');
}

renameCellImages(targetPath);