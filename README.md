# StockDesk: delivery-chain hardening

Hardened version of the supplied fictional StockDesk application. Internal HTTP
port **3000** and the environment variable names are preserved. This submission
hardens delivery; it does not make the demonstration API ready for external suppliers.

## Run and check

Use Node.js 24 for consistency with CI and the image. There are **no npm dependencies**
and no install step or lockfile is needed for the current application.

```sh
npm test
node src/server.js
python -m pip install PyYAML==6.0.3
python scripts/check_yaml.py
```

The server does not automatically load `.env`. Set environment variables in your
shell for direct execution. GET `/api/products` works with the seeded data;
POST `/api/products/<SKU>/adjust` requires `x-api-key` to equal `API_KEY`.
GET `/live` checks the process; GET `/health` checks database TCP reachability.
That check does not authenticate or execute a query. Inventory lives in process
memory and resets on restart.

For development with Docker Compose, copy `.env.example` to `.env`, replace the
example credentials, then run `docker compose up --build`. Compose supplies `.env`
to the app, binds HTTP to localhost, and keeps PostgreSQL off host ports.
The PostgreSQL tag is deliberately marked TODO for digest verification. Do not use
this development stack as a shared or production environment. Existing PostgreSQL
volumes retain their old password: changing `.env` does not rotate that password.

## Delivery design and prerequisites

1. Pull requests run tests, YAML parsing, and Trivy secret/misconfiguration scanning
   with read-only GitHub permissions. There are no deployment credentials in this job.
2. Only pushes to `main` can publish, after validation. The trusted publish job builds
   a commit-tagged image, scans it for HIGH/CRITICAL vulnerabilities (including
   unfixed ones), generates a CycloneDX SBOM, logs in only for the push, and records
   its registry digest. The SBOM and published image reference are retained together
   as a commit-named GitHub Actions artifact for 14 days. SBOM generation is configured
   but has not been executed; no generated SBOM is claimed as part of this submission.
3. The deploy job receives that immutable reference, renders the single image
   placeholder, applies only Deployment/Service, and waits for rollout. Failures stop
   the workflow; no test or scan failure is ignored.

Before adapting this fictional workflow to a real environment, the repository and
platform administrators must:

- Confirm `main` is the delivery branch. Protect it with reviews and required
  validation; review workflow changes particularly carefully.
- Configure `publish` and `shared-test` environments to allow only `main` and require
  approval where supported. YAML environment names alone do not enable protections.
- Put a repository-scoped registry push credential in the `publish` environment as
  `REGISTRY_USERNAME` and `REGISTRY_TOKEN`. Put a restricted, non-admin kubeconfig in
  `shared-test` as `KUBECONFIG`. Do not expose these as PR secrets.
- Replace the fictional registry host in workflow env, digest checks, and manifest
  together. Verify registry reachability and CI-to-cluster connectivity.
- Confirm kubectl v1.34.1 is compatible with the actual API server; change the pin if
  needed. The cluster version is unknown, so compatibility is not claimed.
- Provision `stockdesk-env` in namespace `default` with `DB_HOST`, `DB_PORT`,
  `DB_USER`, `DB_PASSWORD`, `API_KEY`, using rotated values. Configure a reachable
  database and, for a private registry, an image-pull credential on the workload's
  service account or pod. That pull credential is distinct from CI's push token.
- Scope deploy RBAC to the required Deployment/Service apply operations and rollout
  observation in this namespace. Do not grant cluster-admin or Secret-management
  rights. The kubeconfig identity and actual RBAC cannot be verified here.

An operator can create the Secret from a protected file **outside the repository**:

```sh
kubectl create secret generic stockdesk-env -n default --from-env-file=/secure/stockdesk.env
```

Do not print that file or pass credentials as literal command-line arguments.
For an existing Secret, use the organization's controlled update procedure and
restart the workload to load changed environment variables. Enable etcd encryption
at rest, restrict Secret access, and audit access. Base64 is not encryption.

The manifest's `REPLACE_WITH_CI_COMMIT_SHA` image is a deliberate deployment
placeholder, replaced with a **digest** by CI. Do not apply it unchanged. For manual
operation, render it with the actual scanned registry digest first.

## Runtime choices and limitations

- Non-root UID/GID 1000; no privilege escalation; all capabilities dropped;
  RuntimeDefault seccomp; read-only root; bounded writable `/tmp` for the existing
  startup marker. CPU/memory settings are initial estimates, not benchmark results.
- `/live` drives startup/liveness; `/health` drives readiness. A database outage
  removes the pod from Service endpoints without creating a restart loop.
- One replica and `Recreate` avoid deliberately overlapping inventory writers.
  This causes deployment downtime and **does not prevent inventory loss** on restart.
  Durable shared persistence is required before scaling or claiming availability.
- ClusterIP removes direct load-balancer exposure. This is a deliberate access change:
  external suppliers need a separately designed TLS/authenticated gateway. ClusterIP
  does not block other cluster workloads. NetworkPolicy is deliberately not implemented:
  ingress-controller identities, DNS/database destinations and CNI enforcement support
  are unknown. An operator must establish these before designing and testing a policy;
  no network isolation is claimed.

## Automatic update proposals

`.github/dependabot.yml` schedules weekly update pull requests for GitHub Actions,
the Docker base image, development Compose images and npm dependencies (none exist
currently). Updates require review and validation; automatic merging is not enabled.
This configuration has not been exercised by GitHub. Inline tool-version inputs
(Trivy, kubectl and the PyYAML install command) still require manual review.
See [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## Verification and review

Local checks performed on 16 November 2026:

- All seven tests passed on Node v22.17.1 and v24.22.3, including the original five
  tests and regressions for probe separation and startup credential leakage.
- All four YAML files parsed. The workflow passed actionlint v1.7.12, and its five
  shell blocks passed Bash syntax checks. ShellCheck was not run.
- Docker Compose configuration validation passed using example environment values;
  no containers were started. Action commit references and the Node image digest
  were checked against upstream sources.

No Docker build, container runtime, Trivy scan/SBOM generation, registry push, GitHub workflow run,
Kubernetes schema/admission check, cluster apply, or external credential rotation
was performed. YAML parsing and static checks do not prove deployment or production
readiness. The pipeline is intentionally illustrative, as required by the brief.

Read [RISKS.md](RISKS.md) for the prioritised findings, incident-response sequence
and residual risks, [THREAT-NOTE.md](THREAT-NOTE.md) for attack paths, and
[DESIGN-NOTE.md](DESIGN-NOTE.md) for the English design note, unfinished work and
AI-use declaration.
