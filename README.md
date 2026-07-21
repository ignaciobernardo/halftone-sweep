# Halftone Sweep

A generative visual effect: a circular grid of small squares that independently toggle between filled and hollow states as a user-selectable sweep pattern travels across the grid, looping seamlessly.

**Live:** https://natochi.cv/tools/halftone-sweep/

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build          # outputs to dist/
npm run verify:final   # typecheck, tests, build, browser tests
```

Built with React, Vite and TypeScript. See `specs/` for the product spec.

## License

See [LICENSE.md](LICENSE.md).
