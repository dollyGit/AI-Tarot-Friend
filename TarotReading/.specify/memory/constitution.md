<!--
SYNC IMPACT REPORT
==================
Version Change: INITIAL (template) → 1.0.0 (first ratification)

New Principles Added:
- I. User First (用戶至上)
- II. Content Quality (內容品質)
- III. Security & Privacy (安全與隱私)
- IV. Token Cost Control (Token 成本控制)
- V. Observability (可觀測性)
- VI. Spec-Driven Development (開發方法)

Modified Sections:
- Added Performance Standards section with SLO targets
- Added Development Workflow section with three-stage gate process

Templates Status:
✅ plan-template.md - Constitution Check section references this file
✅ spec-template.md - Requirement structure aligns with user-first principle
✅ tasks-template.md - Task structure supports observability and testing requirements
✅ All command files - No agent-specific updates required (generic references maintained)

Follow-up TODOs: None - all placeholders resolved
==================
-->

# TarotReading Constitution

## Core Principles

### I. User First (用戶至上)

All tarot interpretations and user interactions MUST prioritize empathy and clear action guidance.

- Responses MUST provide constructive, actionable insights
- Language MUST avoid fatalistic or fear-inducing phrasing
- Content MUST empower users to make informed decisions
- Every interaction MUST respect user emotional state and context

**Rationale**: Tarot readings serve as guidance tools, not deterministic predictions. User trust depends on compassionate, responsible communication that supports personal agency rather than creating anxiety or dependency.

### II. Content Quality (內容品質)

Tarot interpretations MUST adhere to established symbolic frameworks while providing contextual relevance.

- System MUST support Rider-Waite 78-card deck (22 Major Arcana + 56 Minor Arcana)
- Interpretations MUST account for both upright and reversed positions
- Readings MUST integrate card meanings with user-provided context
- System MUST support standard spreads (three-card, Celtic Cross, etc.) with documented references
- Card meanings MUST draw from recognized tarot traditions and AI-assisted interpretation patterns

**Rationale**: Quality interpretations require fidelity to tarot symbolism combined with contextual adaptation. Standardizing on the Rider-Waite system ensures consistency while maintaining flexibility for personalized insights.

### III. Security & Privacy (安全與隱私)

User data protection and psychological safety are non-negotiable requirements.

- Data minimization: Collect only information essential for reading interpretation
- User rights: MUST support data export and deletion requests
- Encryption: MUST encrypt data in transit (TLS) and at rest
- Audit trails: MUST log access to sensitive user data
- Crisis detection: MUST implement pattern detection for mental health crisis indicators
- Referral system: MUST provide mental health resource information when crisis patterns detected

**Rationale**: Tarot readings often involve personal, emotionally sensitive content. Users must trust that their data is protected and that the system responds appropriately to mental health concerns.

### IV. Token Cost Control (Token 成本控制)

AI inference costs MUST be managed through architectural discipline and operational governance.

- Model selection: MUST default to smallest model capable of quality interpretation
- Caching: MUST cache standard card meanings and common spread patterns
- Retrieval optimization: MUST use vector search for card meaning lookup before LLM generation
- Streaming: MUST generate long interpretations in segments
- Rate limiting: MUST enforce per-user rate limits to prevent abuse
- Quota management: MUST implement hard daily/monthly token budgets with alerts

**Rationale**: Sustainable operation of AI-powered tarot services requires strict cost controls. Unmanaged token usage creates financial risk and potential service unavailability.

### V. Observability (可觀測性)

System behavior MUST be transparent, measurable, and debuggable at all times.

- Logging: MUST log all API requests, errors, and user interactions (with PII redaction)
- Metrics: MUST track API latency, error rates, token usage, and user satisfaction
- Tracing: MUST support distributed tracing across service boundaries
- SLO-driven: Engineering decisions MUST reference defined Service Level Objectives
- Progressive rollout: MUST support gradual feature deployment with rollback capability

**Service Level Objectives (SLOs)**:
- API response time: P95 < 800ms
- System availability: 99.9% uptime
- Error rate: < 0.1% of requests
- Token budget adherence: < 105% of monthly allocation

**Rationale**: Observability enables rapid incident response, informed optimization decisions, and accountability to performance standards. SLOs provide measurable targets that drive engineering discipline.

### VI. Spec-Driven Development (開發方法)

All features MUST progress through a three-stage specification and implementation workflow.

**Mandatory Workflow**:
1. **Specify** (`/speckit.specify`): Define user requirements and acceptance criteria
2. **Plan** (`/speckit.plan`): Research, design data models, and define contracts
3. **Tasks** (`/speckit.tasks`): Generate dependency-ordered implementation tasks
4. **Implement** (`/speckit.implement`): Execute tasks with testing validation

**Quality Gates**:
- Gate 1 (Post-Specify): No unresolved `[NEEDS CLARIFICATION]` markers
- Gate 2 (Post-Plan): Constitution Check passes (all principles validated)
- Gate 3 (Post-Tasks): All tasks have clear file paths and dependencies
- Gate 4 (Post-Implement): All tests pass, code reviewed

**Optional Enhancement Commands**:
- `/speckit.clarify`: Systematically resolve underspecified requirements
- `/speckit.analyze`: Cross-artifact consistency validation
- `/speckit.checklist`: Generate feature-specific validation checklists

**Rationale**: Spec-driven development prevents rework, ensures constitutional compliance, and maintains documentation currency. The gated workflow enforces quality standards before code is written.

## Performance Standards

All API endpoints and user-facing features MUST meet the following targets:

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (P95) | < 800ms | End-to-end latency from request to response |
| System availability | 99.9% | Monthly uptime percentage |
| Error rate | < 0.1% | Failed requests / total requests |
| Token budget adherence | < 105% | Actual monthly tokens / allocated budget |
| Crisis detection latency | < 2s | Time to identify and respond to crisis indicators |

Performance failures MUST trigger alerts and incident response procedures.

## Development Workflow

All development activities MUST follow the Spec-Driven Development process:

1. **Feature Request**: User provides natural language description
2. **Specification** (`/speckit.specify`): Generate `spec.md` with user stories and requirements
3. **Planning** (`/speckit.plan`): Generate `plan.md`, `research.md`, `data-model.md`, and `contracts/`
4. **Task Generation** (`/speckit.tasks`): Generate `tasks.md` with dependency-ordered checklist
5. **Implementation** (`/speckit.implement`): Execute tasks, run tests, commit changes
6. **Review**: Verify all gates passed, documentation current, constitution compliance

**Branch Naming**: `###-feature-name` where `###` is auto-incremented feature number

**Documentation Structure**:
```
specs/
└── ###-feature-name/
    ├── spec.md              # User requirements (mandatory)
    ├── plan.md              # Technical design (mandatory)
    ├── tasks.md             # Implementation checklist (mandatory)
    ├── research.md          # Technology research (optional)
    ├── data-model.md        # Entity definitions (optional)
    ├── quickstart.md        # Setup instructions (optional)
    ├── contracts/           # API specifications (optional)
    └── checklists/          # Validation checklists (optional)
```

## Governance

This constitution is the supreme authority for all development practices and architectural decisions.

**Amendment Procedure**:
1. Proposed changes MUST document rationale and impact analysis
2. Amendments MUST update version number (semantic versioning)
3. Version bumps follow:
   - MAJOR: Backward-incompatible principle changes or removals
   - MINOR: New principles or significant guidance additions
   - PATCH: Clarifications, wording improvements, typo fixes
4. All dependent templates MUST be updated for consistency
5. Sync Impact Report MUST be generated and committed with constitution

**Compliance Review**:
- All pull requests MUST verify constitutional compliance
- Constitution Check section in `plan.md` MUST validate all principles
- Complexity violations MUST be explicitly justified in writing
- SLO failures MUST trigger incident review and remediation

**Agent Context Management**:
- Agent-specific context files (e.g., `.claude/agent-context.md`) maintained via `.specify/scripts/bash/update-agent-context.sh`
- Manual additions preserved between automation markers
- Technology stack entries kept current with implementation decisions

**Version**: 1.0.0 | **Ratified**: 2025-10-08 | **Last Amended**: 2025-10-08
