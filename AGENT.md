# AGENT.md - Working Instructions for the Codex Agent

This repository is prepared and maintained with an autonomous coding agent.

The project is currently in its discovery and setup phase. The agent must establish the project goals and required configuration before generating substantial project code.

## Branch Policy

- All work MUST be done exclusively on the current working branch: `agent`
- Never modify files on `master` or `main`
- Never commit to `master`, `main`, or any other branch unless the user explicitly changes the branch policy
- Do not create additional branches unless the user explicitly asks for it
- Before making any file change, staging files, or creating a commit, the agent MUST verify the current branch
- If the current branch is not `agent`, the agent MUST stop and switch back before continuing
- The branch policy in this file overrides the default branch habits of the agent

## Discovery-First Rule

- Before scaffolding the project, the agent MUST ask focused questions to understand the project
- The agent MUST clarify at least:
  - project purpose
  - target users
  - preferred tech stack
  - required environments and deployment target
  - language requirements
  - initial feature scope
  - desired repository and tooling configuration
- Until these points are clear enough, the agent should limit itself to setup documents, lightweight repo configuration, and planning artifacts
- If a requirement remains ambiguous, the agent should make the assumption explicit before implementing

## Agent Responsibilities

- The agent should act autonomously once the project direction is clear
- The agent should propose sensible defaults when the user does not specify a detail
- The agent may create and update project structure, configuration, source code, documentation, and developer tooling
- The agent should keep the repository coherent and avoid unnecessary complexity
- The agent should prefer maintainable, readable defaults over clever or fragile solutions

## Commit Policy

- The agent MUST commit its own meaningful changes once a coherent unit of work is complete
- Do not leave intentional implementation work uncommitted after a completed task unless the user asks for a pause
- Commits should be logically grouped and keep the repository in a usable state

### Commit Message Rules

- Language: English only
- Use clear, concise, descriptive messages
- Prefer imperative mood

Examples:
- `Add initial agent instructions`
- `Scaffold Vite app with TypeScript`
- `Configure linting and formatting`
- `Add landing page layout and navigation`
- `Document local development setup`

## Working Style

- Prefer small, incremental changes
- Verify assumptions against the actual repository state before editing
- Keep developer documentation up to date as the structure evolves
- Avoid adding tools, frameworks, or services that are not justified by the project requirements
- Prefer simple defaults first, then extend only where needed

## Configuration Rules

- The initial project setup should reflect the user's answers, not generic boilerplate by default
- If the user does not choose a tool, the agent should recommend one and explain the tradeoff briefly
- Tooling should be selected intentionally:
  - frontend framework only if needed
  - backend only if required
  - database only if required
  - build tooling only if justified by the chosen stack
- Secrets must never be committed
- Environment variables should be documented in a dedicated example file when applicable

## Documentation

- Keep documentation developer-focused and practical
- Add or update `README.md` once the project direction is defined
- Document setup, run commands, environment variables, and important architectural decisions

## Definition of Done

Work is considered complete for a given task when:

- The current branch policy has been respected
- The requested change has been implemented coherently
- Relevant documentation has been updated when needed
- The change has been verified as far as the local environment allows
- The agent has either committed the completed work or explicitly explained why it has not been committed yet

## Expected Behaviour

The agent is expected to:

- ask precise questions early
- make explicit recommendations where useful
- implement agreed changes autonomously
- keep commits and structure clean
- avoid drifting away from the project's actual goals
