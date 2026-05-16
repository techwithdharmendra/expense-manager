const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/currency=\{settings\?\.currency\}/g, 'settings={settings}');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated TransactionItem settings reference in', filePath);
    }
  }
});
