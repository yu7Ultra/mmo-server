# Documentation Images

This directory contains images used in the documentation.

## Adding Images

When adding images to documentation:

1. **Place images in this directory**: `documents/images/`
2. **Use descriptive names**: e.g., `architecture-diagram.png`, `client-ui-screenshot.png`
3. **Reference in markdown**: 
   ```markdown
   ![Description](../images/your-image.png)
   ```

## Recommended Image Types

### Architecture Diagrams
- System architecture
- Data flow diagrams
- Component relationships
- Network topology

### Screenshots
- Client UI examples
- Admin panels
- Game features in action
- Debugging tools

### Performance Charts
- Metrics dashboards
- Flame graphs
- Performance comparisons
- Load test results

## Image Guidelines

- **Format**: Use PNG for screenshots, SVG for diagrams when possible
- **Size**: Optimize images (< 500KB recommended)
- **Resolution**: Use appropriate resolution (72-144 DPI)
- **Alt Text**: Always include descriptive alt text for accessibility
- **Naming**: Use lowercase with hyphens (e.g., `client-skill-panel.png`)

## Current Images

Currently, this directory contains placeholder structure. Add images as needed for documentation.

### Suggested Images to Add

1. **Client Screenshots**
   - Main game interface
   - Skill panel with cooldowns
   - Quest tracking UI
   - Chat interface
   - Leaderboard display

2. **Architecture Diagrams**
   - ECS system flow
   - Voice communication WebRTC flow
   - Room lifecycle diagram
   - State synchronization flow

3. **Performance Visuals**
   - Sample flame graph
   - Metrics dashboard example
   - Load test results

## Example Usage

```markdown
## Client Interface

The MMO client provides a rich gaming experience:

![Client Main Interface](../images/client-main-interface.png)

### Skill Panel

Players can use 4 different skills with visual cooldown indicators:

![Skill Panel](../images/skill-panel.png)
```
