/**
 * A* pathfinding implementation for offline routing fallback.
 *
 * Uses haversine as the heuristic function for geographic accuracy.
 * Designed to run in a Web Worker to avoid blocking the main thread.
 */

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  to: string;
  weight: number; // seconds of travel time
  distance: number; // meters
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
}

export interface PathResult {
  path: string[];
  coordinates: [number, number][];
  total_distance: number;
  total_time: number;
}

class MinHeap {
  private heap: { id: string; priority: number }[] = [];

  push(id: string, priority: number) {
    this.heap.push({ id, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): string | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top.id;
  }

  get size() { return this.heap.length; }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function aStar(graph: Graph, startId: string, goalId: string): PathResult | null {
  const goal = graph.nodes.get(goalId);
  if (!goal) return null;

  const openSet = new MinHeap();
  openSet.push(startId, 0);

  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startId, 0);

  const fScore = new Map<string, number>();
  const startNode = graph.nodes.get(startId);
  if (!startNode) return null;
  fScore.set(startId, haversine(startNode.lat, startNode.lng, goal.lat, goal.lng));

  const visited = new Set<string>();

  while (openSet.size > 0) {
    const current = openSet.pop()!;

    if (current === goalId) {
      return reconstructPath(graph, cameFrom, current);
    }

    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = graph.edges.get(current) ?? [];
    const currentG = gScore.get(current) ?? Infinity;

    for (const edge of neighbors) {
      const tentativeG = currentG + edge.weight;
      const prevG = gScore.get(edge.to) ?? Infinity;

      if (tentativeG < prevG) {
        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentativeG);

        const neighbor = graph.nodes.get(edge.to);
        if (neighbor) {
          const h = haversine(neighbor.lat, neighbor.lng, goal.lat, goal.lng) / 13.9; // ~50km/h avg speed → seconds
          fScore.set(edge.to, tentativeG + h);
          openSet.push(edge.to, tentativeG + h);
        }
      }
    }
  }

  return null; // No path found
}

function reconstructPath(graph: Graph, cameFrom: Map<string, string>, current: string): PathResult {
  const path: string[] = [current];
  let totalDistance = 0;
  let totalTime = 0;

  while (cameFrom.has(current)) {
    const prev = cameFrom.get(current)!;
    const edges = graph.edges.get(prev) ?? [];
    const edge = edges.find((e) => e.to === current);
    if (edge) {
      totalDistance += edge.distance;
      totalTime += edge.weight;
    }
    current = prev;
    path.unshift(current);
  }

  const coordinates: [number, number][] = path.map((id) => {
    const node = graph.nodes.get(id)!;
    return [node.lng, node.lat];
  });

  return { path, coordinates, total_distance: totalDistance, total_time: totalTime };
}

/**
 * Build a simple graph from a set of nodes.
 * Connects each node to its nearest neighbors based on distance.
 */
export function buildSimpleGraph(nodes: { id: string; lat: number; lng: number }[], maxNeighbors = 4): Graph {
  const graph: Graph = {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(),
  };

  for (const node of nodes) {
    const distances = nodes
      .filter((n) => n.id !== node.id)
      .map((n) => ({
        to: n.id,
        distance: haversine(node.lat, node.lng, n.lat, n.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxNeighbors);

    graph.edges.set(
      node.id,
      distances.map((d) => ({
        to: d.to,
        distance: d.distance,
        weight: d.distance / 13.9, // ~50 km/h → m/s → seconds
      }))
    );
  }

  return graph;
}
