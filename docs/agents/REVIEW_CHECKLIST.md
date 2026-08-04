# Agent review checklist

## Scope

- Is every changed file necessary for the active issue?
- Did the change add a feature not required by the milestone?
- Are follow-ups recorded explicitly?

## Input and timing

- Are individual samples preserved?
- Are raw and displayed movement separate?
- Is analysis off the render path?
- Are interruptions and unsupported modes visible?

## DSPDS integrity

- Is formal assessment free of reticle, endpoint, and live correction feedback?
- Can practice data enter the official model accidentally?
- Are formal assessments immutable?
- Are confidence and data sufficiency separate from quality?

## Claims

- Are units and metric definitions explicit?
- Is any anatomical or medical certainty implied?
- Is sensitivity presented as a range with uncertainty?
- Can the user inspect the evidence behind important findings?

## Storage

- Is the schema versioned?
- Are migrations and recovery tested?
- Does export/import preserve meaning?

## UI and design

- Does active UI remain minimal?
- Were design annotations accidentally implemented?
- Are text, focus, contrast, and reduced motion acceptable?
- Do first- and third-person sessions remain distinguishable?

## Engineering

- Did a new dependency remove enough risk to justify itself?
- Is React isolated from per-frame simulation?
- Are tests deterministic?
- Does the PR document deliberate exclusions and known limitations?
