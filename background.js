import {normalizeStyle, normalizeSet, importSets} from './core.js';
// Library writes go through one queue so popup and side panel cannot race.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.type === 'CAPTURE' && sender.tab) {
    queue = queue.catch(() => {}).then(async () => {
      const capture = normalizeStyle({...message.style, source: sender.tab.url});
      await chrome.storage.local.set({lastCapture:{...capture, capturedAt:Date.now()}});
      return {ok:true};
    });
  } else if (message.type === 'SAVE_SET' && !sender.tab) {
    queue = queue.catch(() => {}).then(async () => {
      const normalized = normalizeSet(message.set);
      const {library = []} = await chrome.storage.local.get('library');
      const existing = library.find(x => x.id === message.set.id);
      if (existing) normalized.id = existing.id;
      const next = [normalized, ...library.filter(x => x.id !== normalized.id)];
      if (next.length > 200) throw new Error('Library is full (200 pairings). Export a backup and remove a pairing first.');
      await chrome.storage.local.set({library:next});
      return {ok:true, set:normalized};
    });
  } else if (message.type === 'DELETE_SET' && !sender.tab) {
    queue = queue.catch(() => {}).then(async () => {
      const {library = []} = await chrome.storage.local.get('library');
      await chrome.storage.local.set({library:library.filter(x => x.id !== message.id)});
      return {ok:true};
    });
  } else if (message.type === 'IMPORT_SETS' && !sender.tab) {
    queue = queue.catch(() => {}).then(async () => {
      const imported = importSets(message.text);
      const {library = []} = await chrome.storage.local.get('library');
      if (library.length + imported.length > 200) throw new Error('Import would exceed 200 pairings. Export a backup and free some space first.');
      await chrome.storage.local.set({library:[...imported,...library]});
      return {ok:true, count:imported.length};
    });
  } else return;
  queue.then(reply, e => reply({ok:false,error:e.message}));
  return true;
});
