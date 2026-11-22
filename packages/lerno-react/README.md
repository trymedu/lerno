# @medu/lerno-react

React components and interactive STEM labs built on [`@medu/lerno`](../lerno).

`Display` lowers a Lerno node tree to SVG, the hooks bind `Property` values to React renders, and
`LernoPlayer` plays a `LernoDocument`. The labs are ready-made simulations with controls.

## Install

```bash
bun add @medu/lerno @medu/lerno-react react react-dom @heroui/react
```

`@heroui/react`, `react`, and `react-dom` are peer dependencies. HeroUI styles and theme variables
must be loaded by the application.

Tailwind consumers add the built package to the content scan:

```css
@source 'node_modules/@medu/lerno-react/dist';
```

## Usage

```tsx
import { Property, CircleNode } from '@medu/lerno';
import { Display, useProperty } from '@medu/lerno-react';

const radius = new Property(40);
const circle = new CircleNode(120, 80, radius.get());
radius.link((value) => {
  circle.radius = value;
});

export function Scene() {
  useProperty(radius);
  return <Display node={circle} width={240} height={160} />;
}
```

## License

MIT
