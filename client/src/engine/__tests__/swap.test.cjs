const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Execute the real engine without importing Expo's native runtime.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
const { swapOutfit, outfitSignature } = require('../swap.ts');
const { mapWardrobeItemToDisplay: display } = require('../suggest.ts');
const item = (id, category, h = 0, s = 0) => ({
  id, category, name: category, color_h: h, color_s: s, color_l: 50,
  formality: 3, contexts: 'Đi học', image_path: '', wear_count: 0, created_at: '',
});
const wardrobe = [item(1, 'Áo'), item(2, 'Quần'), item(3, 'Quần'), item(4, 'Váy'), item(5, 'Áo')];
const current = wardrobe.slice(0, 2).map(display);
const seen = new Set([outfitSignature(current)]);
const swap = (locks, history = seen, random = () => 0) => swapOutfit(current, wardrobe, locks, 'Đi học', history, random);
const next = swap(['1']);
assert.equal(next[0], current[0], 'locked item is preserved exactly');
assert.notEqual(next[1].id, 2);
seen.add(outfitSignature(next));
const another = swap(['1']);
assert.notEqual(another[1].id, next[1].id, 'prefer unseen alternatives');
seen.add(outfitSignature(another));
assert.ok(swap(['1']), 'cycle when alternatives have been exhausted');
assert.equal(swap(['1', '2']), null);
assert.equal(swapOutfit(current, wardrobe.slice(0, 2), [], 'Đi học', seen), null);
assert.ok(swap([]).every((entry, index) => entry.id !== current[index].id));
assert.equal(swapOutfit([], wardrobe, [], 'Đi học', seen), null);
const colorful = [item(10, 'Áo', 0, 80), item(11, 'Quần', 0, 80), item(12, 'Quần', 80, 80), item(13, 'Quần', 10, 80)];
assert.equal(swapOutfit(colorful.slice(0, 2).map(display), colorful, ['10'], 'Đi học', new Set(), () => 0)[1].id, 13, 'prefer harmonious colors');
let draws = [0, 0.99];
assert.equal(swap(['1'], new Set(), () => draws.shift())[1].id, 4, 'jitter breaks equal scores');
const dresses = [item(20, 'Đầm'), item(21, 'Đầm'), item(22, 'Váy')];
assert.equal(swapOutfit([display(dresses[0])], dresses, [], 'Đi học', new Set())[0].id, 21);
assert.deepEqual(current.map((entry) => entry.id), [1, 2], 'inputs are not mutated');
console.log('Lock/Swap: all assertions passed');
