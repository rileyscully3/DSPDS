# Product specification summary

## Product purpose

DSPDS studies how a user intuitively maps visible spatial events to physical mouse movement when ordinary closed-loop camera and reticle feedback is removed. Form Blend then trains coordinated movement phases using direct, inspectable feedback.

The application is intended for one primary user, but data contracts should not prevent multiple local profiles later.

## DSPDS scenarios

### Single-target displacement

A sphere appears at an angular offset on a flat wall. The camera remains fixed, no reticle or cursor appears, and physical mouse movement does not affect the scene. The target is treated as acquired. The system records the user's intuitive displacement, direction, speed, smoothness, and stopping behavior.

### Chained target flicking

The active and next target are visible. The user physically flicks with no camera response. After movement completion, the application automatically reorients the camera to the intended active target, not the user's physical endpoint. Chains test continuations, reversals, diagonals, and amplitude changes.

### Predictable camera-follow tracking

The application automatically tracks a target through predictable left-right and related paths. The user mirrors the camera movement physically while mouse input has no visual effect.

### Dynamic target-follow tracking

Two separate formal blocks are supported: a static-camera invisible-reticle interpretation and an automatically tracking-camera interpretation. Motion is smooth, bounded, reproducible, and non-evasive.

### Straight-line tracing

A line grows from screen center during formal assessment. The user traces the perceived path physically with no cursor, reticle, camera response, or visible endpoint. Practice may later vary the origin.

## Formal assessment and practice

- Formal assessment uses the complete controlled protocol and updates the official evolving spatial model.
- Formal trials provide no trial-level corrective feedback.
- Practice can provide restrained feedback and is archived separately.
- Practice never silently updates the official model.
- Formal assessments and generated model snapshots are immutable historical records.

## Physical movement baseline

After the DSPDS model exists, visible closed-loop blocks measure arm-primary, wrist-primary, fingertip-primary, and freestyle movement. Instructions are concise and natural. Results compare speed, accuracy, smoothness, precision, stopping, correction behavior, direction, and movement envelopes.

Similarity between a later phase and an isolated baseline is probabilistic; it is not anatomical proof.

## Form Blend repetition

1. Large primary sweep, cued as arm-primary.
2. Controlled transition and stopping action.
3. Smaller secondary flick, cued as wrist-primary.
4. Final micro-adjustment, cued as fingertip-primary.
5. Click after control is established.

Assistance progresses through demonstration, hard stop, reduced hard stop, soft damping, cue only, and fully unassisted performance.

Hard stop freezes only the virtual camera. Soft damping changes only displayed camera gain. Raw physical movement remains fully recorded and controls evaluation.

## Profiles and settings

A local user profile can contain multiple equipment profiles. Equipment profiles include mouse, DPI, target and measured cm/360, FOV, view mode, verification status, DSPDS history, spatial-model snapshots, movement baselines, and sessions.

The physical cm/360 tester is recommended but optional and accessible from setup, home, pause, equipment profile, and relevant results.

FOV never changes degrees per input count. First- and third-person sessions are stored separately. Formal DSPDS initially runs in first person.

## Storage

- IndexedDB
- automatic save after completed trials
- recovery after refresh or interruption
- versioned schemas and migrations
- complete JSON import/export
- no backend, account, or internet requirement after application load

## Result principles

- Lead with what the internal spatial model is doing.
- Separate stable traits, possible changes, low confidence, insufficient data, and normal variation.
- Sensitivity is a derived range with confidence, not a perfect answer.
- Consequential findings must expose supporting measurements.
- Provide one useful coaching action rather than a data dump during training.
