# Design Note

**Approach.** I focused first on the most serious security problems, especially exposed passwords and ways to execute unwanted code. I worked on a separate copy of the project and kept the existing setup, including internal port 3000 and the current environment variable names. I also kept Node.js, GitHub Actions, Docker and Kubernetes to avoid unnecessary changes to the project.

**Main choices.** I separated pull request checks from the jobs that publish images and deploy the application. Pull requests only have read permissions, while deployment credentials are only available to the steps and environments that need them.

Tests and Trivy security scans must pass before an image can be deployed. I also checked the pinned GitHub Actions versions and Node base image against their official sources. Deployment uses the exact image digest that was pushed to the registry. CI is configured to generate a CycloneDX SBOM and retain it with the published image reference for 14 days. Dependabot is configured to propose weekly updates for actions, Docker/Compose images and npm dependencies; updates require review. Neither feature has been executed in GitHub. The registry used in this project is fictional, and GitHub branch protection and environment settings still need to be configured by an administrator.

The Docker image only contains the files needed to run the application. The debugger was removed, and the application now runs as a non-root user. Kubernetes also applies extra security settings, such as removing unnecessary permissions, preventing privilege escalation and using a read-only filesystem. The `/tmp` directory remains writable but has a size limit because the application needs it for its startup file.

I added separate liveness and readiness checks so that a database problem does not cause unnecessary application restarts. CPU and memory limits were also added, but their values are initial estimates and still need testing.

The Kubernetes Service remains internal until proper access controls are added for suppliers.

I kept one application replica with the `Recreate` strategy because inventory is currently stored in memory. Running multiple replicas without shared storage could cause inconsistent inventory data. This means deployments can cause downtime, and restarting the application still causes inventory data loss. A proper storage solution is needed before increasing the number of replicas.

Secrets must be created outside Git, and all exposed credentials must be changed in the systems where they are used. Simply removing them from the repository does not make them invalid.

**Checks and limitations.** All seven tests passed using Node.js 22 and 24. I also checked the YAML files, GitHub Actions workflows with actionlint, Bash syntax and Docker Compose configuration. All these checks passed locally.

However, I did not run a Docker build, Trivy scan, GitHub Actions workflow, registry push or Kubernetes deployment. These checks only confirm that the files and tests work locally. They do not prove that the application is ready for production. The README explains which checks were performed and which were not. No real cloud account or Kubernetes cluster was used.

**What is still missing.** Some improvements were not included in this work because of time and scope. These include database-backed inventory, separate access permissions for each supplier, request-size limits, rate limiting, HTTPS access, PodDisruptionBudgets, and moving the application to a dedicated namespace.

Image signing and build provenance verification are also still missing. The exact PostgreSQL development image digest still needs to be checked. NetworkPolicy is deliberately not implemented because the required cluster traffic, workload identities and CNI support are unknown. No network isolation is claimed; an operator must establish these details before designing and testing a policy.

The real Kubernetes permissions, cluster compatibility, registry access, Secret creation and credential rotation also need to be handled by the platform administrators.

**AI use.** I used OpenAI Codex as a development assistant for security review, drafting code and configuration changes, documentation, and local checks. Its suggestions were verified through official references, application tests and configuration checks. I remain responsible for reviewing the changes, making the final decisions, and understanding and explaining the submission.
