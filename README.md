# Synatic Entity Sync Action

GitHub Action to sync Synatic entities between organizations using version-controlled **plan files**.

Typical workflow:

1. **Plan** — Generate a sync plan from a source org (e.g. UAT) and commit it to Git for review.
2. **Execute** — Apply an approved plan to a destination org (e.g. production).

Plans are stored in your repository (default: `.synatic/plans/`) so changes can be reviewed, versioned, and rolled back.

## Prerequisites

- A Synatic instance API base URL (e.g. `https://api.example.com`)
- Org API keys (`syn_api_...`) with access to source and destination orgs
- GitHub Actions secrets for `SYNATIC_API_URL` and `SYNATIC_API_KEY`

## Usage

### Generate a plan (auto-commit + PR, default)

```yaml
name: Entity Sync Plan

on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1"

permissions:
  contents: write
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate entity sync plan
        id: sync-plan
        uses: synatic/entity-sync-action@v1
        with:
          command: plan
          api-url: ${{ secrets.SYNATIC_API_URL }}
          api-key: ${{ secrets.SYNATIC_API_KEY }}
          source-org: acme-uat
          root-type: flow
          root-id: 507f1f77bcf86cd799439011
          plan-path: .synatic/plans/flow-order-processing.json
          plan-options: '{"includeReverseDeps": true}'
```

By default the action commits the plan to a new branch and opens a pull request.

### Generate a plan (write-only, manual commit)

```yaml
      - name: Generate plan file
        uses: synatic/entity-sync-action@v1
        with:
          command: plan
          api-url: ${{ secrets.SYNATIC_API_URL }}
          api-key: ${{ secrets.SYNATIC_API_KEY }}
          source-org: acme-uat
          root-type: flow
          root-id: 507f1f77bcf86cd799439011
          plan-path: .synatic/plans/flow-order-processing.json
          auto-commit: "false"

      - name: Commit plan
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .synatic/plans/
          git diff --staged --quiet || git commit -m "chore: update entity sync plan"
          git push
```

### Execute a committed plan

```yaml
name: Entity Sync Execute

on:
  workflow_dispatch:

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Preview and execute plan
        uses: synatic/entity-sync-action@v1
        with:
          command: execute
          api-url: ${{ secrets.SYNATIC_API_URL }}
          api-key: ${{ secrets.SYNATIC_API_KEY }}
          dest-org: acme-prod
          plan-path: .synatic/plans/flow-order-processing.json
          preview-first: "true"
          fail-on-conflict: "true"
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `command` | yes | — | `plan` or `execute` |
| `api-url` | yes | — | Synatic API base URL |
| `api-key` | yes | — | Org API key (`syn_api_...`) |
| `source-org` | plan | — | Source org name for `/plan` |
| `root-type` | plan | — | Root entity type |
| `root-id` | plan | — | Root entity ObjectId |
| `plan-path` | no | `.synatic/plans/plan.json` | Plan file path in repo |
| `plan-options` | no | `{}` | JSON plan options |
| `auto-commit` | no | `true` | Commit plan to Git (plan command) |
| `create-pr` | no | `true` | Open PR when auto-commit is enabled |
| `pr-title` | no | auto | PR title |
| `pr-body` | no | auto | PR body |
| `pr-base-branch` | no | `main` | Base branch for PR/commit |
| `commit-message` | no | `chore: update entity sync plan` | Commit message |
| `dest-org` | execute | — | Destination org name |
| `preview-first` | no | `true` | Preview before execute |
| `preview-only` | no | `false` | Stop after preview |
| `fail-on-conflict` | no | `true` | Fail when preview reports conflicts |

### Root types

`flow`, `solution`, `buffer`, `dataStore`, `parameter`, `relay`, `userGroup`, `serviceView`, `flowTrigger`

## Outputs

| Output | Description |
| --- | --- |
| `plan-id` | Plan UUID |
| `plan-path` | Path to plan file |
| `branch-name` | Branch created (plan + auto-commit) |
| `run-id` | Execute run ID |
| `summary` | Preview or execute summary (JSON string) |
| `conflicts` | Conflict count from preview |

## API essentials

All endpoints live under:

```text
{api-url}/v1/organizations/{orgName}/entity-sync/...
```

| Command | Endpoint | Org in URL |
| --- | --- | --- |
| plan | `POST /plan` | Source org |
| execute (preview) | `POST /preview` | Destination org |
| execute | `POST /execute` | Destination org |
| audit | `GET /runs/{runId}` | Destination org |

Authentication:

```http
Authorization: Bearer syn_api_<key>
Content-Type: application/json
```

**Important:** Pass the plan JSON unchanged from plan → preview → execute. Do not edit plan payloads client-side. The API does not store plans server-side — Git is the source of truth.

### Recommended repo layout

```text
.synatic/
  plans/
    flow-order-processing.json
    manifest.json
```

`manifest.json` is a small metadata sidecar written by the action (plan file path, plan ID, root, generated timestamp).

## Security

- Store API keys in GitHub Actions **secrets**, never in the repository.
- Plan files contain entity configuration snapshots. Treat them as sensitive if they describe production systems.
- Use branch protection and required reviews on workflows that execute plans to production.
- Restrict workflow `permissions` to the minimum required.

## Limitations (v1)

- Same Synatic instance/region only (source and destination orgs on one deployment)
- Buffer row data is not synced (definitions only)
- No cross-region export/import via these endpoints

## License

MIT — see [LICENSE](LICENSE).
