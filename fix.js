const fs = require('fs');
let text = fs.readFileSync('src/components/MapView.tsx', 'utf8');
text = text.split('\\`').join('`');
text = text.split('\\$').join('$');
fs.writeFileSync('src/components/MapView.tsx', text);
console.log('Fixed escape bindings natively.');
