const fs = require('fs');
const path = require('path');

const map = {
  "admin-analytics": "admin",
  "admin-chat": "admin",
  "admin-dashboard": "admin",
  "admin-login": "admin",
  "admin-orders": "admin",
  "product-form": "admin",

  "cart": "store",
  "product-card": "store",
  "product-image-carousel": "store",
  "products-section": "store",
  "user-orders": "store",
  "orders-page-content": "store",

  "auth-modal": "shared",
  "chat-box": "shared",
  "location-picker": "shared",
  "order-tracking-map": "shared",

  "contact-section": "layout",
  "footer": "layout",
  "header": "layout",
  "hero": "layout",
  "newsletter-banner": "layout"
};

// 1. Move files
Object.entries(map).forEach(([comp, folder]) => {
    const oldPath = path.join(__dirname, 'components', `${comp}.tsx`);
    const newDir = path.join(__dirname, 'components', folder);
    const newPath = path.join(newDir, `${comp}.tsx`);
    if(fs.existsSync(oldPath)) {
        if(!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${comp}.tsx to ${folder}/`);
    } else {
        console.log(`Warn: ${comp}.tsx not found in root components/`);
    }
});

// 2. Function to fix imports in a file
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    Object.entries(map).forEach(([comp, folder]) => {
        // Absolute imports
        const regex1 = new RegExp(`("@/components/${comp}")`, 'g');
        if(regex1.test(content)) {
            content = content.replace(regex1, `"@/components/${folder}/${comp}"`);
            modified = true;
        }
        const regex1b = new RegExp(`('@/components/${comp}')`, 'g');
         if(regex1b.test(content)) {
            content = content.replace(regex1b, `'@/components/${folder}/${comp}'`);
            modified = true;
        }

        // Relative imports (convert to absolute to guarantee it works)
        const regex2 = new RegExp(`("\\./${comp}")`, 'g');
        if(regex2.test(content)) {
            content = content.replace(regex2, `"@/components/${folder}/${comp}"`);
            modified = true;
        }
        const regex2b = new RegExp(`('\\./${comp}')`, 'g');
        if(regex2b.test(content)) {
            content = content.replace(regex2b, `'@/components/${folder}/${comp}'`);
            modified = true;
        }
    });

    if(modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${filePath}`);
    }
}

// 3. Scan all files
function walkFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for(const file of files) {
        const fullPath = path.join(dir, file);
        if(fs.statSync(fullPath).isDirectory()) {
            if(file !== 'node_modules' && file !== '.next' && file !== '.git') {
                walkFiles(fullPath);
            }
        } else {
            if(fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
                processFile(fullPath);
            }
        }
    }
}

console.log("Refactoring process started...");
walkFiles(path.join(__dirname, 'app'));
walkFiles(path.join(__dirname, 'components'));
walkFiles(path.join(__dirname, 'contexts'));
walkFiles(path.join(__dirname, 'lib'));

console.log("Refactoring complete.");
