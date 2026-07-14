import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BattlefieldNavigator,
  projectNavigationObstacles,
} from '../dist/types/client/battlefieldNavigation.js';

const customManifestPath = process.argv[2];
const isFullManifest = !customManifestPath;
const locations = JSON.parse(
  readFileSync(customManifestPath ?? new URL('../src/client/battlefield-locations.json', import.meta.url), 'utf8'),
);
const expectedIds = new Set(
  Array.from({ length: 6 }, (_, column) =>
    Array.from({ length: 5 }, (_, row) => `c${String(column + 1).padStart(2, '0')}-r${String(row + 1).padStart(2, '0')}`),
  ).flat(),
);

if (isFullManifest) assert.equal(locations.length, 30, 'battlefield manifest must contain 30 locations');
assert.equal(new Set(locations.map((location) => location.id)).size, locations.length, 'location ids must be unique');

const viewports = [
  { width: 1200, height: 900 },
  { width: 1600, height: 900 },
];
const edgeExtension = 120;
let obstacleCount = 0;
let waterCount = 0;
let maxSpawnAdjustment = 0;

for (const location of locations) {
  if (isFullManifest) assert(expectedIds.delete(location.id), `unexpected or duplicate location ${location.id}`);
  assert(location.obstacles.length >= 5, `${location.id} needs at least five detailed obstacles`);
  assert.equal(
    new Set(location.obstacles.map((obstacle) => obstacle.id)).size,
    location.obstacles.length,
    `${location.id} obstacle ids must be unique`,
  );

  const obstacles = location.obstacles.map((obstacle) => {
    assert(obstacle.points.length >= 3, `${location.id}/${obstacle.id} must be a polygon`);
    for (const point of obstacle.points) {
      assert(Number.isFinite(point.x) && Number.isFinite(point.y), `${location.id}/${obstacle.id} has invalid coordinates`);
      assert(point.x >= 0 && point.x <= 1, `${location.id}/${obstacle.id} x must be normalized`);
      assert(point.y >= 0 && point.y <= 1, `${location.id}/${obstacle.id} y must be normalized`);
    }

    const area = Math.abs(
      obstacle.points.reduce((sum, point, index) => {
        const next = obstacle.points[(index + 1) % obstacle.points.length];
        return next ? sum + point.x * next.y - next.x * point.y : sum;
      }, 0) / 2,
    );
    assert(area > 0.00001, `${location.id}/${obstacle.id} polygon area is too small`);
    obstacleCount += 1;

    const isWater = /^(water|river|sea|lake|coast)-/i.test(obstacle.id);
    if (isWater) waterCount += 1;
    return { points: obstacle.points };
  });

  for (const viewport of viewports) {
    const starts = [
      { x: -50, y: viewport.height - 85 },
      { x: viewport.width + 50, y: viewport.height - 85 },
      { x: 90, y: -50 },
      { x: viewport.width / 2, y: -50 },
      { x: viewport.width - 90, y: -50 },
    ];
    const target = { x: viewport.width / 2, y: viewport.height / 2 };
    const projectedObstacles = projectNavigationObstacles(obstacles, {
      sourceWidth: 4,
      sourceHeight: 3,
      ...viewport,
      edgeExtension,
    });
    const navigator = new BattlefieldNavigator({ ...viewport, obstacles: projectedObstacles });
    for (const requestedStart of starts) {
      const start = navigator.nearestReachablePerimeterPoint(requestedStart, target);
      assert(
        start,
        `${location.id} central battle area has no reachable perimeter spawn at ${viewport.width}x${viewport.height}`,
      );
      const spawnAdjustment = Math.hypot(start.x - requestedStart.x, start.y - requestedStart.y);
      maxSpawnAdjustment = Math.max(maxSpawnAdjustment, spawnAdjustment);
      assert(
        spawnAdjustment <= Math.hypot(viewport.width, viewport.height) * 0.62,
        `${location.id} requires an excessive ${Math.round(spawnAdjustment)}px perimeter spawn relocation at ${viewport.width}x${viewport.height}`,
      );
      const route = navigator.findPath(start, target);
      const end = route.at(-1);
      assert(end, `${location.id} has no route from (${requestedStart.x}, ${requestedStart.y})`);
      let segmentStart = start;
      for (const waypoint of route) {
        assert(
          navigator.isSegmentClear(segmentStart, waypoint),
          `${location.id} route from (${requestedStart.x}, ${requestedStart.y}) intersects an obstacle`,
        );
        segmentStart = waypoint;
      }
      assert(
        Math.hypot(end.x - target.x, end.y - target.y) <= Math.min(viewport.width, viewport.height) * 0.25,
        `${location.id} route from (${requestedStart.x}, ${requestedStart.y}) cannot reach the central battle area`,
      );
    }
  }
}

if (isFullManifest) {
  assert.equal(expectedIds.size, 0, `missing locations: ${[...expectedIds].join(', ')}`);
  assert(waterCount > 0, 'detailed collision manifest must include water obstacles');
}

console.log(
  `battlefield verification passed: ${locations.length} locations, ${obstacleCount} obstacles, ${waterCount} water polygons, max spawn adjustment ${Math.round(maxSpawnAdjustment)}px`,
);
