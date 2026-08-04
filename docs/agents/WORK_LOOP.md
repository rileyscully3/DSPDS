# Agent work loop

The repository uses a lightweight loop-engineering model. The purpose is not to simulate a large organization; it is to force each agent pass to leave verifiable artifacts and prevent unbounded implementation drift.

## Roles

One agent may perform all roles sequentially, but must keep their outputs distinct.

### 1. Planner

Produces a task packet containing:

- governing requirements
- smallest coherent vertical slice
- affected contracts and schemas
- explicit exclusions
- acceptance criteria
- test and manual evidence plan
- risks and unknowns

### 2. Implementer

Builds only the agreed slice. It records deviations and does not silently reinterpret the plan.

### 3. Verifier

Runs tests, manual protocols, screenshots, exports, and performance checks. Verification is evidence gathering, not a restatement of intent.

### 4. Reviewer

Inspects the diff for:

- scope creep
- hidden coupling
- product or design mismatch
- data contamination
- unsupported inference
- missing failure/recovery states
- unnecessary dependencies

## Inner loop

```text
Orient -> Plan -> Implement -> Test -> Inspect -> Correct -> Record
```

Repeat the smallest failing step rather than restarting the whole task.

## Outer loop

At each milestone boundary:

1. Run the vertical slice end to end.
2. Compare the result against milestone acceptance criteria.
3. Review architecture and schema drift.
4. Capture known limitations.
5. Decide whether evidence supports the next milestone.

## Task packet template

```markdown
# Outcome

# Governing requirements

# In scope

# Explicitly out of scope

# Affected contracts

# Acceptance criteria

# Automated evidence

# Manual evidence

# Risks and unknowns
```

## Agent handoff rule

A later agent should never need hidden conversational context to understand a change. Decisions, assumptions, validation, and unresolved risks belong in the issue, PR, tests, or repository documents.

## Escalation rule

Do not ask the user to choose between low-level implementation details that are already constrained by the architecture. Escalate only product tradeoffs, irreversible data choices, or contradictions between authoritative sources.
