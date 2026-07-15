export type NavigationPoint = {
  x: number;
  y: number;
};

export type NavigationObstacle = {
  points: readonly NavigationPoint[];
};

type NavigationGridOptions = {
  width: number;
  height: number;
  obstacles: readonly NavigationObstacle[];
  cellSize?: number;
  clearance?: number;
  margin?: number;
};

export type NavigationProjectionOptions = {
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  edgeExtension?: number;
  edgeThreshold?: number;
};

export function getRoundRobinIndex(startIndex: number, offset: number, total: number) {
  if (total <= 0) return 0;
  return (startIndex + offset) % total;
}

export function getNavigationPlanDelay(
  stalled: boolean,
  repathDelay: number,
  retryDelay: number,
) {
  return stalled ? retryDelay : repathDelay;
}

export function prioritizeStalledNavigationPlan(
  nextPathfindAt: number,
  now: number,
  stalled: boolean,
  retryDelay: number,
) {
  return stalled ? Math.min(nextPathfindAt, now + retryDelay) : nextPathfindAt;
}

type OpenNode = {
  index: number;
  score: number;
  heuristic: number;
};

const CARDINAL_COST = 1;
const DIAGONAL_COST = Math.SQRT2;
const NEIGHBORS = [
  { column: 1, row: 0, cost: CARDINAL_COST },
  { column: 0, row: 1, cost: CARDINAL_COST },
  { column: -1, row: 0, cost: CARDINAL_COST },
  { column: 0, row: -1, cost: CARDINAL_COST },
  { column: 1, row: 1, cost: DIAGONAL_COST },
  { column: -1, row: 1, cost: DIAGONAL_COST },
  { column: -1, row: -1, cost: DIAGONAL_COST },
  { column: 1, row: -1, cost: DIAGONAL_COST },
] as const;
const OPPOSITE_NEIGHBOR = [2, 3, 0, 1, 6, 7, 4, 5] as const;

export function projectNavigationObstacles(
  obstacles: readonly NavigationObstacle[],
  options: NavigationProjectionOptions,
) {
  const edgeExtension = options.edgeExtension ?? 120;
  const edgeThreshold = options.edgeThreshold ?? 0.025;
  const scale = Math.max(options.width / options.sourceWidth, options.height / options.sourceHeight);
  const renderedWidth = options.sourceWidth * scale;
  const renderedHeight = options.sourceHeight * scale;
  const left = (options.width - renderedWidth) / 2;
  const top = (options.height - renderedHeight) / 2;

  return obstacles.map((obstacle) => ({
    points: obstacle.points.map((point) => {
      let x = left + point.x * renderedWidth;
      let y = top + point.y * renderedHeight;

      if (point.x <= edgeThreshold || x <= 0) x = Math.min(x, -edgeExtension);
      if (point.x >= 1 - edgeThreshold || x >= options.width) {
        x = Math.max(x, options.width + edgeExtension);
      }
      if (point.y <= edgeThreshold || y <= 0) y = Math.min(y, -edgeExtension);
      if (point.y >= 1 - edgeThreshold || y >= options.height) {
        y = Math.max(y, options.height + edgeExtension);
      }

      return { x, y };
    }),
  }));
}

class MinHeap {
  private values: OpenNode[] = [];

  get size() {
    return this.values.length;
  }

  push(value: OpenNode) {
    this.values.push(value);
    let index = this.values.length - 1;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.values[parentIndex];
      if (!parent || !this.precedes(value, parent)) break;
      this.values[index] = parent;
      index = parentIndex;
    }

    this.values[index] = value;
  }

  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;

    let index = 0;
    this.values[0] = last;

    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      const left = this.values[leftIndex];
      const right = this.values[rightIndex];
      if (!left) break;

      let childIndex = leftIndex;
      let child = left;
      if (right && this.precedes(right, left)) {
        childIndex = rightIndex;
        child = right;
      }

      const current = this.values[index];
      if (!current || !this.precedes(child, current)) break;
      this.values[index] = child;
      this.values[childIndex] = current;
      index = childIndex;
    }

    return first;
  }

  private precedes(a: OpenNode, b: OpenNode) {
    if (a.score !== b.score) return a.score < b.score;
    if (a.heuristic !== b.heuristic) return a.heuristic < b.heuristic;
    return a.index < b.index;
  }
}

export class BattlefieldNavigator {
  private readonly width: number;
  private readonly height: number;
  private readonly obstacles: readonly NavigationObstacle[];
  private readonly cellSize: number;
  private readonly clearance: number;
  private readonly margin: number;
  private readonly minX: number;
  private readonly minY: number;
  private readonly columns: number;
  private readonly rows: number;
  private readonly blocked: Uint8Array;
  private readonly connections: Uint8Array;
  private readonly components: Int32Array;

  constructor(options: NavigationGridOptions) {
    this.width = options.width;
    this.height = options.height;
    this.obstacles = options.obstacles;
    this.cellSize = options.cellSize ?? Math.max(16, Math.min(24, Math.round(Math.min(this.width, this.height) / 32)));
    this.clearance = options.clearance ?? Math.max(10, this.cellSize * 0.65);
    this.margin = options.margin ?? Math.max(72, this.cellSize * 3);
    this.minX = -this.margin;
    this.minY = -this.margin;
    this.columns = Math.max(1, Math.ceil((this.width + this.margin * 2) / this.cellSize));
    this.rows = Math.max(1, Math.ceil((this.height + this.margin * 2) / this.cellSize));
    this.blocked = new Uint8Array(this.columns * this.rows);
    this.connections = new Uint8Array(this.blocked.length);
    this.components = new Int32Array(this.blocked.length);
    this.components.fill(-1);
    this.buildOccupancyGrid();
    this.buildConnections();
    this.buildComponents();
  }

  findPath(from: NavigationPoint, target: NavigationPoint) {
    const startIndex = this.findNearestWalkableIndex(from);
    const goalIndex = this.findNearestWalkableIndex(target);
    if (startIndex === undefined || goalIndex === undefined) return [];

    if (this.isSegmentClear(from, target)) return [{ ...target }];

    const cameFrom = new Int32Array(this.blocked.length);
    cameFrom.fill(-1);
    const costs = new Float64Array(this.blocked.length);
    costs.fill(Number.POSITIVE_INFINITY);
    const closed = new Uint8Array(this.blocked.length);
    const open = new MinHeap();
    const goalCell = this.cellForIndex(goalIndex);
    const startHeuristic = this.heuristic(startIndex, goalCell.column, goalCell.row);
    let bestIndex = startIndex;
    let bestHeuristic = startHeuristic;

    costs[startIndex] = 0;
    open.push({ index: startIndex, score: startHeuristic, heuristic: startHeuristic });

    while (open.size > 0) {
      const current = open.pop();
      if (!current || closed[current.index] === 1) continue;
      closed[current.index] = 1;

      if (current.heuristic < bestHeuristic || (current.heuristic === bestHeuristic && current.index < bestIndex)) {
        bestIndex = current.index;
        bestHeuristic = current.heuristic;
      }

      if (current.index === goalIndex) {
        bestIndex = goalIndex;
        break;
      }

      const cell = this.cellForIndex(current.index);
      for (let neighborIndex = 0; neighborIndex < NEIGHBORS.length; neighborIndex += 1) {
        if (!((this.connections[current.index] ?? 0) & (1 << neighborIndex))) continue;
        const neighbor = NEIGHBORS[neighborIndex];
        if (!neighbor) continue;
        const nextColumn = cell.column + neighbor.column;
        const nextRow = cell.row + neighbor.row;
        const nextIndex = this.indexForCell(nextColumn, nextRow);
        if (closed[nextIndex] === 1) continue;
        const nextCost = (costs[current.index] ?? Number.POSITIVE_INFINITY) + neighbor.cost;
        if (nextCost >= (costs[nextIndex] ?? Number.POSITIVE_INFINITY)) continue;

        const nextHeuristic = this.heuristic(nextIndex, goalCell.column, goalCell.row);
        cameFrom[nextIndex] = current.index;
        costs[nextIndex] = nextCost;
        open.push({
          index: nextIndex,
          score: nextCost + nextHeuristic,
          heuristic: nextHeuristic,
        });
      }
    }

    const indices = this.reconstructPath(cameFrom, startIndex, bestIndex);
    if (indices.length < 2) return [];

    const points = indices.map((index) => this.pointForIndex(index));
    const simplified = this.simplifyPath(from, points.slice(1));
    const lastPoint = simplified[simplified.length - 1] ?? from;
    if (bestIndex === goalIndex && this.isSegmentClear(lastPoint, target)) {
      if (this.distanceSquared(lastPoint, target) > 1) simplified.push({ ...target });
    }

    return simplified;
  }

  isBlocked(point: NavigationPoint) {
    return this.obstacles.some((obstacle) => this.circleIntersectsPolygon(point, this.clearance, obstacle.points));
  }

  isSegmentClear(from: NavigationPoint, to: NavigationPoint) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const sampleStep = Math.max(3, this.clearance * 0.45);
    const steps = Math.max(1, Math.ceil(distance / sampleStep));

    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      const point = {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
      };
      if (this.isBlocked(point)) return false;
    }

    return true;
  }

  nearestWalkablePoint(point: NavigationPoint) {
    const index = this.findNearestWalkableIndex(point);
    return index === undefined ? undefined : this.pointForIndex(index);
  }

  isReachable(from: NavigationPoint, target: NavigationPoint) {
    const startIndex = this.findNearestWalkableIndex(from);
    const targetIndex = this.findNearestWalkableIndex(target);
    if (startIndex === undefined || targetIndex === undefined) return false;
    return this.components[startIndex] === this.components[targetIndex];
  }

  nearestReachablePoint(point: NavigationPoint, target: NavigationPoint) {
    const targetIndex = this.findNearestWalkableIndex(target);
    if (targetIndex === undefined) return undefined;
    const component = this.components[targetIndex];
    if (component === undefined || component < 0) return undefined;
    const index = this.findNearestWalkableIndex(point, component);
    return index === undefined ? undefined : this.pointForIndex(index);
  }

  nearestReachablePerimeterPoint(point: NavigationPoint, target: NavigationPoint) {
    const targetIndex = this.findNearestWalkableIndex(target);
    if (targetIndex === undefined) return undefined;
    const component = this.components[targetIndex];
    if (component === undefined || component < 0) return undefined;
    const perimeterBand = this.cellSize * 1.75;
    let bestIndex: number | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.blocked.length; index += 1) {
      if (this.blocked[index] === 1 || this.components[index] !== component) continue;
      const candidate = this.pointForIndex(index);
      const isPerimeter =
        candidate.x <= perimeterBand ||
        candidate.x >= this.width - perimeterBand ||
        candidate.y <= perimeterBand ||
        candidate.y >= this.height - perimeterBand;
      if (!isPerimeter) continue;
      const distance = this.distanceSquared(candidate, point);
      if (distance < bestDistance || (distance === bestDistance && (bestIndex === undefined || index < bestIndex))) {
        bestIndex = index;
        bestDistance = distance;
      }
    }

    return bestIndex === undefined ? undefined : this.pointForIndex(bestIndex);
  }

  private buildOccupancyGrid() {
    for (let index = 0; index < this.blocked.length; index += 1) {
      this.blocked[index] = this.isBlocked(this.pointForIndex(index)) ? 1 : 0;
    }
  }

  private buildConnections() {
    for (let index = 0; index < this.blocked.length; index += 1) {
      if (this.blocked[index] === 1) continue;
      const cell = this.cellForIndex(index);
      const from = this.pointForIndex(index);

      for (let neighborIndex = 0; neighborIndex < NEIGHBORS.length; neighborIndex += 1) {
        const neighbor = NEIGHBORS[neighborIndex];
        if (!neighbor) continue;
        const column = cell.column + neighbor.column;
        const row = cell.row + neighbor.row;
        if (!this.isCellWalkable(column, row)) continue;
        if (
          neighbor.column !== 0 &&
          neighbor.row !== 0 &&
          (!this.isCellWalkable(cell.column + neighbor.column, cell.row) ||
            !this.isCellWalkable(cell.column, cell.row + neighbor.row))
        ) {
          continue;
        }

        const nextIndex = this.indexForCell(column, row);
        const to = this.pointForIndex(nextIndex);
        if (!this.isSegmentClear(from, to) || !this.isSegmentClear(to, from)) continue;
        const oppositeNeighbor = OPPOSITE_NEIGHBOR[neighborIndex];
        if (oppositeNeighbor === undefined) continue;
        this.connections[index] = (this.connections[index] ?? 0) | (1 << neighborIndex);
        this.connections[nextIndex] = (this.connections[nextIndex] ?? 0) | (1 << oppositeNeighbor);
      }
    }
  }

  private buildComponents() {
    const queue = new Int32Array(this.blocked.length);
    let component = 0;

    for (let startIndex = 0; startIndex < this.blocked.length; startIndex += 1) {
      if (this.blocked[startIndex] === 1 || this.components[startIndex] !== -1) continue;
      let readIndex = 0;
      let writeIndex = 1;
      queue[0] = startIndex;
      this.components[startIndex] = component;

      while (readIndex < writeIndex) {
        const currentIndex = queue[readIndex];
        readIndex += 1;
        if (currentIndex === undefined) continue;
        const cell = this.cellForIndex(currentIndex);

        for (let neighborIndex = 0; neighborIndex < NEIGHBORS.length; neighborIndex += 1) {
          if (!((this.connections[currentIndex] ?? 0) & (1 << neighborIndex))) continue;
          const neighbor = NEIGHBORS[neighborIndex];
          if (!neighbor) continue;
          const column = cell.column + neighbor.column;
          const row = cell.row + neighbor.row;
          const nextIndex = this.indexForCell(column, row);
          if (this.components[nextIndex] !== -1) continue;
          this.components[nextIndex] = component;
          queue[writeIndex] = nextIndex;
          writeIndex += 1;
        }
      }

      component += 1;
    }
  }

  private simplifyPath(from: NavigationPoint, points: readonly NavigationPoint[]) {
    const simplified: NavigationPoint[] = [];
    let anchor = from;
    let index = 0;

    while (index < points.length) {
      let furthest: number | undefined;
      for (let candidate = points.length - 1; candidate >= index; candidate -= 1) {
        const point = points[candidate];
        if (point && this.isSegmentClear(anchor, point)) {
          furthest = candidate;
          break;
        }
      }

      if (furthest === undefined) break;
      const waypoint = points[furthest];
      if (!waypoint) break;
      simplified.push(waypoint);
      anchor = waypoint;
      index = furthest + 1;
    }

    return simplified;
  }

  private reconstructPath(cameFrom: Int32Array, startIndex: number, endIndex: number) {
    const path = [endIndex];
    let current = endIndex;

    while (current !== startIndex) {
      const previous = cameFrom[current] ?? -1;
      if (previous < 0) return [];
      path.push(previous);
      current = previous;
    }

    path.reverse();
    return path;
  }

  private findNearestWalkableIndex(point: NavigationPoint, requiredComponent?: number) {
    const origin = this.cellForPoint(point);
    const maxRadius = Math.max(this.columns, this.rows);

    for (let radius = 0; radius <= maxRadius; radius += 1) {
      let bestIndex: number | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
        for (let columnOffset = -radius; columnOffset <= radius; columnOffset += 1) {
          if (radius > 0 && Math.abs(columnOffset) !== radius && Math.abs(rowOffset) !== radius) continue;
          const column = origin.column + columnOffset;
          const row = origin.row + rowOffset;
          if (!this.isCellWalkable(column, row)) continue;
          const index = this.indexForCell(column, row);
          if (requiredComponent !== undefined && this.components[index] !== requiredComponent) continue;
          const candidate = this.pointForIndex(index);
          const distance = this.distanceSquared(candidate, point);
          if (distance < bestDistance || (distance === bestDistance && (bestIndex === undefined || index < bestIndex))) {
            bestIndex = index;
            bestDistance = distance;
          }
        }
      }

      if (bestIndex !== undefined) return bestIndex;
    }

    return undefined;
  }

  private isCellWalkable(column: number, row: number) {
    return (
      column >= 0 &&
      column < this.columns &&
      row >= 0 &&
      row < this.rows &&
      this.blocked[this.indexForCell(column, row)] === 0
    );
  }

  private heuristic(index: number, targetColumn: number, targetRow: number) {
    const cell = this.cellForIndex(index);
    const dx = Math.abs(cell.column - targetColumn);
    const dy = Math.abs(cell.row - targetRow);
    return Math.max(dx, dy) + (DIAGONAL_COST - 1) * Math.min(dx, dy);
  }

  private cellForPoint(point: NavigationPoint) {
    return {
      column: Math.max(0, Math.min(this.columns - 1, Math.floor((point.x - this.minX) / this.cellSize))),
      row: Math.max(0, Math.min(this.rows - 1, Math.floor((point.y - this.minY) / this.cellSize))),
    };
  }

  private cellForIndex(index: number) {
    return {
      column: index % this.columns,
      row: Math.floor(index / this.columns),
    };
  }

  private indexForCell(column: number, row: number) {
    return row * this.columns + column;
  }

  private pointForIndex(index: number) {
    const cell = this.cellForIndex(index);
    return {
      x: this.minX + (cell.column + 0.5) * this.cellSize,
      y: this.minY + (cell.row + 0.5) * this.cellSize,
    };
  }

  private circleIntersectsPolygon(
    center: NavigationPoint,
    radius: number,
    polygon: readonly NavigationPoint[],
  ) {
    if (this.pointInPolygon(center, polygon)) return true;
    const radiusSquared = radius * radius;

    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (start && end && this.distanceToSegmentSquared(center, start, end) <= radiusSquared) return true;
    }

    return false;
  }

  private pointInPolygon(point: NavigationPoint, polygon: readonly NavigationPoint[]) {
    let inside = false;

    for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
      const current = polygon[index];
      const previous = polygon[previousIndex];
      if (!current || !previous) continue;

      const crosses =
        current.y > point.y !== previous.y > point.y &&
        point.x <
          ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
      if (crosses) inside = !inside;
    }

    return inside;
  }

  private distanceToSegmentSquared(point: NavigationPoint, start: NavigationPoint, end: NavigationPoint) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return this.distanceSquared(point, start);
    const projection = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
    );
    return this.distanceSquared(point, {
      x: start.x + projection * dx,
      y: start.y + projection * dy,
    });
  }

  private distanceSquared(a: NavigationPoint, b: NavigationPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
}
