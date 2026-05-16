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
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/formatCurrency\(([^,]*),\s*settings\?\.currency\)/g, 'formatCurrency($1, settings)');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated formatCurrency settings reference in', filePath);
    }
  }
});

// Also replace getCurrencySymbol(settings?.currency) with getCurrencySymbol(settings)
walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/getCurrencySymbol\(settings\?\.currency\)/g, 'getCurrencySymbol(settings)');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated getCurrencySymbol settings reference in', filePath);
    }
  }
});
