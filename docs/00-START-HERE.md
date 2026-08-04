# Start here

This repository is prepared for a low-engagement, high-discipline Codex implementation. The goal is to reduce repeated user decisions without allowing agents to silently invent product behavior.

## Source authority

1. **Approved product specification:** mechanics, data behavior, scientific restraint, milestones, acceptance criteria.
2. **Final Claude Design handoff:** visual presentation, component system, scene materials, layout, interaction detail, motion.
3. **Pass 3 correction memo:** authoritative corrections to illustrative inconsistencies in the design package.
4. **Repository contracts:** architecture, guardrails, data model, test strategy, implementation order.
5. **Active issue/task packet:** the current bounded slice.

Higher authority wins. Report conflicts; do not silently merge meanings.

## External handoff assets

The source PDF and final design ZIP are listed in `docs/handoff/ASSET_MANIFEST.md`. Their durable binary copies should be added before the main Codex implementation begins. The Markdown documents in this repository are operational summaries, not replacements for the source artifacts.

## Read paths

### Product or UX work

1. `docs/product/PRODUCT_SPEC_SUMMARY.md`
2. `docs/product/DECISIONS.md`
3. `docs/design/DESIGN_HANDOFF.md`
4. Active issue

### Input, engine, or scenario work

1. `docs/architecture/ARCHITECTURE.md`
2. `docs/architecture/INPUT_AND_SCIENCE_GUARDRAILS.md`
3. `docs/architecture/DATA_MODEL.md`
4. `docs/engineering/TEST_STRATEGY.md`
5. Active issue

### Storage or analysis work

1. `docs/architecture/DATA_MODEL.md`
2. `docs/architecture/INPUT_AND_SCIENCE_GUARDRAILS.md`
3. `docs/product/DECISIONS.md`
4. Active issue

## Development sequence

Do not build all screens first. Prove the input and data foundations, then deliver end-to-end vertical slices in the milestone order documented in `docs/engineering/IMPLEMENTATION_PLAN.md`.

## Default rule for ambiguity

Prefer the smallest reversible implementation that preserves raw evidence, schema evolution, and the ability to inspect why a result was produced.
