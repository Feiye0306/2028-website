const fs = require('fs');
let gitignore = fs.readFileSync('.gitignore', 'utf8');

// 原本擋 .env、*.key、*.token、API_KEYS_MASTER.md 的行被移除，只剩 node_modules/，合併前必須先確認處理方式，建議不要照原樣合併此檔。
// Oh wait, my `echo "node_modules/" > .gitignore` accidentally removed the others.
// The diff shows I only added node_modules/ now, but wait!
// The diff above shows:
// @@ -3,3 +3,4 @@
//  *.key
//  *.token
//  API_KEYS_MASTER.md
// +node_modules/
// This means the previous files are NOT removed.
