import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

const doctrineSource = readFileSync(resolve(root, 'src/server/core/doctrines.ts'), 'utf8');
const sharedSource = readFileSync(resolve(root, 'src/shared/api.ts'), 'utf8');
const resolverSource = readFileSync(resolve(root, 'src/server/core/resolver.ts'), 'utf8');
const commentSignalSource = readFileSync(resolve(root, 'src/server/core/commentSignals.ts'), 'utf8');
const territorySource = readFileSync(resolve(root, 'src/server/core/territories.ts'), 'utf8');

const doctrineIds = ['STRIKE', 'HACK', 'VIRUS', 'PHANTOM', 'SHIELD', 'OVERLOAD', 'TRAP'];

for (const doctrineId of doctrineIds) {
  assert(sharedSource.includes(`"${doctrineId}"`), `shared contract is missing ${doctrineId}`);
  assert(doctrineSource.includes(`${doctrineId}: {`), `doctrine definition is missing ${doctrineId}`);
  assert(commentSignalSource.includes(`${doctrineId}: [`), `comment keyword mapping is missing ${doctrineId}`);
}

assert(sharedSource.includes('MVP_GAME_LOOP_STEPS'), 'MVP loop contract is missing');
assert(sharedSource.includes('type OrderRequest'), 'order request contract is missing');
assert(sharedSource.includes('type BattleResultView'), 'battle result contract is missing');
assert(resolverSource.includes('getDoctrineMatchup'), 'resolver does not use doctrine matchups');
assert(resolverSource.includes('getDominantDoctrine'), 'resolver does not choose dominant doctrine');
assert(resolverSource.includes('applyTerritoryWinner'), 'resolver does not update territory owner');
assert(territorySource.match(/id: '/g)?.length === 12, 'territory list must contain exactly 12 territories');

console.log('core verification passed');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
