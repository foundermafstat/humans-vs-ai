# Battle location image-generation prompts

Coordinates start at the upper-left of `world.webp`: columns `c01`–`c06` run left to right, rows `r01`–`r05` run top to bottom.

## Shared production prompt

```text
Use case: stylized-concept
Asset type: splash-screen battlefield background for a deterministic Phaser battle
Input image: use the supplied 229×229 global-map cell only as a visual reference.
Primary request: Recreate that exact world-map cell as a close-up battlefield location. Preserve its biome, palette, signature landmark, roads, rivers, and the direction in which terrain continues toward neighboring cells. Do not merely upscale the reference.
Style/medium: polished original 16-bit pixel art matching the global map; strict top-down orthographic view; crisp terrain clusters and readable silhouettes.
Composition/framing: horizontal 4:3. Keep an open central combat area and clear traversable corridors connecting the edges. Leave safe open spawn space near the corners and edges. Every permanent obstacle must have at least two visible bypass routes.
Obstacle language: buildings, deep water, cliffs, dense tree clusters, fortifications, and large rocks must read as clearly impassable islands separated by walkable ground.
Constraints: empty static environment intended to sit behind animated soldiers; no baked-in characters, soldiers, armies, moving vehicles, grid, text, labels, UI, frame, border, flags, logos, or watermark.
Avoid: isometric perspective, tilted camera, photorealism, soft painterly rendering, blocked central arena, narrow dead ends, objects touching every route.
```

## Coordinate-specific briefs

| Location | Required identity |
|---|---|
| `c01-r01` | Dense conifer taiga, tall wood-and-metal watchtower, curving dirt road. |
| `c02-r01` | Forest clearing, sunken concrete bunker with broad entrance, road arriving from southwest. |
| `c03-r01` | Dense taiga at the foot of the mountains, rocky wall along the east edge. |
| `c04-r01` | High mountains, diagonal snowy ridges, narrow traversable pass. |
| `c05-r01` | Snowy taiga, sparse firs and boulders, mountain slope west, radar complex hinted east. |
| `c06-r01` | Arctic radar base, geodesic dome, radio mast, winding access road. |
| `c01-r02` | Green forest zone, branching dirt roads, firs and shrubs, no major building. |
| `c02-r02` | Fortified command center, concrete perimeter, communications buildings, satellite dish. |
| `c03-r02` | East edge of command-base wall on west, small pillbox northeast, road continuing south. |
| `c04-r02` | Rocky foothills, watchtower at mountain base, road passing it. |
| `c05-r02` | Snow-to-dry transition, snowy firs north, rocky thaw corridor, sand south. |
| `c06-r02` | Snowy radar access road among sparse firs transitioning to desert at south edge. |
| `c01-r03` | Diagonal forest river, rocky banks, terrain becoming marshy toward south. |
| `c02-r03` | Massive stone bridge connecting a green bank to marsh lowland. |
| `c03-r03` | Central green crossroads, meadows, sparse trees and rocks. |
| `c04-r03` | Biome border, concrete bunker at Y-junction, green west, sand and river east/south. |
| `c05-r03` | Desert defensive line, curved sandbag wall, cacti, visible routes around both ends. |
| `c06-r03` | Desert missile/anti-air twin launcher on a circular concrete platform. |
| `c01-r04` | Deep marsh, dark water, reeds, winding channels, dead trees. |
| `c02-r04` | Round stone artillery platform on an island among marsh channels. |
| `c03-r04` | Marsh-to-forest edge, wet west, dry pine grove east, open bypass trails. |
| `c04-r04` | Controlled river crossing, bridge, barrier, concrete blocks, tall watchtower. |
| `c05-r04` | Desert logistics corridor, open sand, S-shaped road, checkpoint west, hangar edge east. |
| `c06-r04` | Desert motor pool, large green hangar, open entrance, parked truck, concrete apron. |
| `c01-r05` | Black marsh, deepest channels, dense cluster of large dead trees. |
| `c02-r05` | Flooded grove, reed islands, dead trees, transition to higher green ground east. |
| `c03-r05` | Coastal conifer forest, rocks, river bending along east edge. |
| `c04-r05` | River-to-desert transition, river west, green grove center, sand east. |
| `c05-r05` | Open desert, long winding road, sparse cacti and rocks, approach to southern bunker. |
| `c06-r05` | Desert defense hub, concrete bunker, semicircle sandbags, radio mast, road loop. |

Final delivery format for every generated source: center-crop to exact 4:3, resize to `1200×900`, encode as WebP quality 70, and name `location-cXX-rYY.webp`.
