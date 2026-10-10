# Fork Maintenance

This branch adds `claude-opus-5-5` to the Claude OAuth source registry.
The `release/v3.8.52` baseline already includes Sonnet 5.5 and OAuth model
 discovery; preserve those upstream implementations.

The Opus entry uses conservative 200k context metadata. Larger contexts and
reasoning effort tiers require independent verification before being advertised.

## Upgrade Checks

- If upstream adds the same model, retain its implementation and the regression
  test rather than creating duplicate entries.
- Run registry and OAuth discovery tests before building.
- Build and validate the package separately before deployment; source publication
  does not prove package readiness.
- Verify model identity, streaming, structured tools and conversation replay.
- Never commit credentials, account state, environment files or generated bundles.

## Cursor usage windows (2026-10-07)

`buildPlanUsageQuotas` now returns Auto + Composer and API only, matching
cursor.com. Auth/usage legacy fallback may still expose a single Total window.
TokenGateway also filters Total client-side for currently deployed OmniRoute.

## main synchronization (2026-10-10)

`main` on this fork now includes `wsoft/3.8.52` via merge commit `0a28d9da`
(parents `fc5e2bcc` + `b0758883`). Keep deploying from `wsoft/3.8.52` unless a
release process explicitly retargets. The abort-cleanup fix, Cursor Total
removal and Opus 5.5 registry entry are present on both tips.

