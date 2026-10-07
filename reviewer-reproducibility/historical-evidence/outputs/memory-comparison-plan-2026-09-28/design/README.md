# Prepared comparison design

## Material Passport

- Stage: offline preparation and mechanical validation.
- Status: PREPARED_NOT_EXECUTED.
- Inputs: five archived synthetic profiles, the existing 55-turn therapist scenario, and its six evaluator-only probes; exact hashes are in `input-hashes.json`.
- Evidence scope: data preservation, prompt parity, schedule integrity, and complete baseline-history construction. No model outcomes or comparative effectiveness estimates are produced here.

The five case narratives retain every leaf in `profile`, `clinical`, `therapy`, and `chat`, except `profile.avatarUrl`. Voice settings and routing identifiers are explicitly excluded in `profile-manifest.json`. Its per-leaf path, typed value, value hash, rendered line number, and rendered line hash make the deterministic flat rendering auditable. JSON null is preserved and is not an assertion of absence.

The identical case block and instructions are used in both arms. The template permits only `ARM_CONTEXT` to differ. `prompt_contract.py` is a pure offline helper, not a model runner. The flat arm reads its entire accepted-turn ledger; there is no last-five-turn window or summary substitution. The structured context and provider settings require an explicitly specified adapter before any execution.

The therapist supplies exercise facts. No patient response is prescribed or imported. `scenarios/` contains five 55-turn scripts; `gold/` is separate and evaluator-only. All six probes explicitly request their gold fields without naming expected values. Three repeats per profile use the same known suite, not a holdout.

`run-matrix.json` lists 30 planned trajectories (1,650 therapist turns and 180 probe administrations). `schedule.json` fixes pair and arm order for every session using scheduling seed 20260929; it is not a provider seed. No runtime directory or accepted patient data is created by this generator.

Rebuild and run the offline checks from the application repository:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/memory-comparison-plan-2026-09-28/design/build_design.py
```

Use `--check-only` to validate existing outputs without rebuilding them. The checks block socket connections and write `check.json` and `offline-checks.log`. Those checks use clearly synthetic ledger fixtures, never provider calls. Kit-level freezing and the study protocol are handled outside this directory.
