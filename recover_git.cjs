const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function readGitObject(hash) {
  const dir = hash.substring(0, 2);
  const file = hash.substring(2);
  const p = path.join('.git', 'objects', dir, file);
  if (!fs.existsSync(p)) return null;
  const compressed = fs.readFileSync(p);
  const decompressed = zlib.inflateSync(compressed);
  return decompressed;
}

function findObjectByPath(treeHash, targetPath) {
  const parts = targetPath.split('/');
  let currentTreeHash = treeHash;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const treeData = readGitObject(currentTreeHash);
    if (!treeData) return null;
    
    // Parse tree object
    const nullIdx = treeData.indexOf(0);
    const header = treeData.slice(0, nullIdx).toString('utf8');
    if (!header.startsWith('tree ')) return null;
    
    let pos = nullIdx + 1;
    let foundHash = null;
    while (pos < treeData.length) {
      const spaceIdx = treeData.indexOf(32, pos);
      const mode = treeData.slice(pos, spaceIdx).toString('utf8');
      const nextNullIdx = treeData.indexOf(0, spaceIdx + 1);
      const name = treeData.slice(spaceIdx + 1, nextNullIdx).toString('utf8');
      const hashBuf = treeData.slice(nextNullIdx + 1, nextNullIdx + 21);
      pos = nextNullIdx + 21;
      
      if (name === part) {
        foundHash = hashBuf.toString('hex');
        break;
      }
    }
    
    if (!foundHash) return null;
    currentTreeHash = foundHash;
  }
  
  return currentTreeHash;
}

// 1. Get HEAD commit hash
const headRef = fs.readFileSync('.git/HEAD', 'utf8').trim();
let commitHash = '';
if (headRef.startsWith('ref: ')) {
  commitHash = fs.readFileSync(path.join('.git', headRef.slice(5)), 'utf8').trim();
} else {
  commitHash = headRef;
}

// 2. Get tree hash from commit
const commitData = readGitObject(commitHash);
const commitStr = commitData.toString('utf8');
const treeMatch = commitStr.match(/tree ([0-9a-f]{40})/);
if (treeMatch) {
  const rootTreeHash = treeMatch[1];
  
  // 3. Find app/(app)/tasks/page.tsx
  const targetPath = 'app/(app)/tasks/page.tsx';
  const fileHash = findObjectByPath(rootTreeHash, targetPath);
  if (fileHash) {
    const fileData = readGitObject(fileHash);
    const nullIdx = fileData.indexOf(0);
    const content = fileData.slice(nullIdx + 1).toString('utf8');
    fs.writeFileSync('tasks_page_git.tsx', content);
    console.log('Successfully recovered tasks/page.tsx from git!');
  } else {
    console.log('File not found in tree');
  }
} else {
  console.log('No tree found in commit');
}
