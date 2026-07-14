import assert from 'node:assert/strict';
import {
  BattlefieldNavigator,
  projectNavigationObstacles,
} from '../dist/types/client/battlefieldNavigation.js';

const [croppedObstacle] = projectNavigationObstacles(
  [{ points: [{ x: 0.2, y: 0.1 }, { x: 0.3, y: 0.1 }, { x: 0.3, y: 0.2 }] }],
  { sourceWidth: 4, sourceHeight: 3, width: 1600, height: 900, edgeExtension: 120 },
);
assert(croppedObstacle, 'cover projection must preserve obstacles');
assert.equal(croppedObstacle.points[0]?.y, -120, 'cropped obstacles must seal the actual viewport edge');

const waterWithBridge = [
  {
    points: [
      { x: 90, y: -20 },
      { x: 110, y: -20 },
      { x: 110, y: 82 },
      { x: 90, y: 82 },
    ],
  },
  {
    points: [
      { x: 90, y: 118 },
      { x: 110, y: 118 },
      { x: 110, y: 220 },
      { x: 90, y: 220 },
    ],
  },
];

const bridgeNavigator = new BattlefieldNavigator({
  width: 200,
  height: 200,
  obstacles: waterWithBridge,
  cellSize: 10,
  clearance: 4,
  margin: 20,
});
const start = { x: 20, y: 30 };
const target = { x: 180, y: 30 };
const bridgePath = bridgeNavigator.findPath(start, target);

assert(bridgePath.length >= 2, 'route should bend toward the bridge');
assert(bridgePath.some((point) => point.y > 82 && point.y < 118), 'route must use the bridge opening');
assert(bridgeNavigator.isReachable(start, target), 'bridge must connect both banks');

let segmentStart = start;
for (const waypoint of bridgePath) {
  assert(bridgeNavigator.isSegmentClear(segmentStart, waypoint), 'route segment must stay outside water');
  segmentStart = waypoint;
}
assert.deepEqual(bridgeNavigator.findPath(start, target), bridgePath, 'pathfinding must be deterministic');

const sealedNavigator = new BattlefieldNavigator({
  width: 200,
  height: 200,
  obstacles: [
    {
      points: [
        { x: 90, y: -30 },
        { x: 110, y: -30 },
        { x: 110, y: 230 },
        { x: 90, y: 230 },
      ],
    },
  ],
  cellSize: 10,
  clearance: 4,
  margin: 20,
});
const sealedPath = sealedNavigator.findPath(start, target);
const sealedEnd = sealedPath.at(-1);

assert(!sealedNavigator.isReachable(start, target), 'sealed water must split navigation components');
assert(sealedEnd && sealedEnd.x < 90, 'unit must not cross a sealed river or sea boundary');
assert.notDeepEqual(sealedEnd, target, 'unreachable target must not be returned as a waypoint');

const emptyNavigator = new BattlefieldNavigator({ width: 200, height: 200, obstacles: [] });
assert.deepEqual(emptyNavigator.findPath(start, target), [target], 'open terrain should use a direct route');

console.log('navigation verification passed');
