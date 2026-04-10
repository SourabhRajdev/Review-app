# Architecture Layers

This product is built around a **strict three-layer separation**. The
goal is that the customer never feels surveyed — they play, they tap,
they win something. Internally, three completely independent systems
collaborate without ever touching each other's data:

```
┌────────────────────────────────────────────────────────────────┐
│  CHOICE LAYER  ── the only source of review data               │
│  (folder: choice/)                                             │
│                                                                │
│  User taps a deliberate option ("Loved it" / "Okay" / etc.)    │
│  This is the ONLY signal that ever feeds the review writer.    │
└────────────────────────────────────────────────────────────────┘
                            ↑ never reads ↑
┌────────────────────────────────────────────────────────────────┐
│  ENGAGEMENT LAYER  ── physical action, dopamine                │
│  (folder: engagement/)                                         │
│                                                                │
│  User pulls a bow, swipes a ball, putts. The game generates    │
│  telemetry (drawTimeMs, accuracy, etc.) which is used ONLY by  │
│  the reward layer. It NEVER influences review data.            │
└────────────────────────────────────────────────────────────────┘
                            ↑ never reads ↑
┌────────────────────────────────────────────────────────────────┐
│  REWARD LAYER  ── incentive, luck, discount                    │
│  (folder: reward/)                                             │
│                                                                │
│  Pure function of engagement telemetry. Outputs a reward tier  │
│  the user sees (luck bar, spin wheel, discount). Knows nothing │
│  about the choice layer.                                       │
└────────────────────────────────────────────────────────────────┘
```

## Hard import rules

- `choice/*` may NOT import from `engagement/*` or `reward/*`.
- `engagement/*` may NOT import from `choice/*` or `reward/*`.
- `reward/*` may import from `engagement/*` (it consumes telemetry)
  but NOT from `choice/*`.
- Screens (`screens/*`) may compose from any layer, but must never
  pass data **between** layers in either direction. A screen reads
  choice state to render a heading, reads engagement state to drive
  a 3D scene, reads reward state to render a luck bar — but it
  never copies a value from one store into another.

If you find yourself wanting to break a rule above, the design is
wrong. Stop and rethink before adding the import.
