# Prioritised Security Risks

The risks below are ranked based on how easy they are to exploit, the damage they could cause, and how much access an attacker could gain.

These rankings are based on the security review, not on measured attack probabilities.

The term **Fixed** means the issue was corrected in the project files. It does not mean that the real environment has already been secured.

The example credentials are fictional, but their real-world validity is unknown. They must therefore be treated as exposed. No original credentials are included here.

| Rank / Severity | Risk and possible impact | Actions taken and remaining work |
|---|---|---|
| **1 – Critical** | **Exposed credentials.** Passwords and tokens were present in `.env`, Kubernetes Secret files, CI configuration and Docker Compose. The server also printed configuration details in its logs. Anyone with repository or log access could use these credentials to access the database, API or registry. | **Reduced.** Sensitive files were removed, example values were added, and logging was restricted to approved configuration fields. Credentials must still be rotated. Repository history, old images, logs and user access must also be reviewed. |
| **2 – Critical** | **Unsafe CI workflow.** The original workflow used `pull_request_target`, executed code from pull requests and had write permissions and access to registry credentials. A malicious contributor could use this to steal credentials or modify repository content. | **Fixed in workflow.** Normal pull requests now use read-only permissions. Only trusted jobs from the main branch can publish images and deploy. Credentials are only available to the steps that need them. Branch protection and environment restrictions still need to be enabled. |
| **3 – Critical** | **Command injection.** The original workflow inserted the pull request title directly into a shell command. Someone could create a specially written title to execute unwanted commands in CI. | **Fixed.** The announcement command and direct title interpolation were removed. Other shell inputs are passed through environment variables, and image references are checked against an expected format. |
| **4 – Critical** | **Exposed Node.js debugger.** The original Docker and Kubernetes configurations exposed port `9229`. Anyone able to reach this port could use the debugger to control the running application. | **Fixed in project files.** Debugger startup and exposed debug ports were removed from Docker, Compose and Kubernetes configurations. Existing running deployments still need to be replaced. |
| **5 – High** | **Unsafe builds and deployments.** The original CI workflow could ignore test failures, publish images using the mutable `latest` tag and deploy through an unverified action. This could allow an unsafe image to reach the cluster. | **Reduced.** Tests and security scans must now pass before deployment. Actions and the base image are pinned to specific versions. Images use commit references and deployment uses the exact image digest. Image signatures and provenance checks are still missing. |
| **6 – High** | **Sensitive files inside Docker images.** The original `COPY . .` command could include `.env` files, Secret manifests and other sensitive files in the image. | **Fixed for new builds.** A restricted build context and explicit COPY commands are now used. Old images, registry layers and build caches still need to be checked and cleaned up. |
| **7 – High** | **Container permissions.** The original container did not have proper non-root or security settings. If the application was compromised, an attacker could have more access than necessary. | **Reduced.** The container now runs as a non-root user. The filesystem is read-only, unnecessary Linux capabilities are removed, and privilege escalation is disabled. The pod also has seccomp restrictions and does not automatically receive a Kubernetes API token. |
| **8 – High** | **Unrestricted network access.** The original Kubernetes Service used `LoadBalancer`, exposing the HTTP API and debugger. No NetworkPolicy was provided to control communication between workloads. | **Reduced.** The Service now uses `ClusterIP`, and the debugger port was removed. The development API only listens on localhost. NetworkPolicy is deliberately not implemented because cluster traffic requirements, workload identities and CNI support are unknown; no network isolation is claimed. TLS, authentication, supplier access restrictions and rate limiting still need to be implemented. The API should not be exposed externally yet. |
| **9 – High** | **Application-level security problems.** Inventory is stored in memory, product information can be accessed without authentication, and all clients share one API key for write operations. Request bodies also have no size limit. A restart can erase inventory, while large requests can consume too much memory. | **Not fixed.** Resource limits reduce some of the impact, but the application still needs database-backed inventory, separate supplier credentials, request-size limits, rate limiting and audit logs. |
| **10 – Medium** | **Health checks and resource management.** The original liveness check depended on the database. If the database went down, Kubernetes could unnecessarily restart the application. CPU and memory limits were also missing. | **Reduced.** Separate liveness, readiness and startup checks were added. CPU and memory limits are now defined, and temporary storage is restricted. The database check only verifies a TCP connection, so further testing is needed. |
| **11 – Medium** | **Kubernetes Secret management.** Secret values were stored in base64 format in Git. The deployment also used the default namespace, and the cluster's RBAC, encryption and registry access settings were unknown. | **Partially reduced.** Secret values were removed from the submission, and the application uses explicit Secret references. The operator must create new Secrets, configure RBAC, enable encryption and auditing, and check registry access permissions. |
| **12 – Medium** | **Uncontrolled dependencies.** Docker Compose used `postgres:latest`, and some dependencies and tools were not fully pinned. This makes builds less predictable and can introduce unexpected changes. | **Reduced.** Compose is now marked for development use only and requires local credentials. PostgreSQL uses a major version tag, but its exact image digest still needs verification. Weekly Dependabot update proposals and CI CycloneDX SBOM generation/artifact retention are configured but have not been executed. Updates require review; inline tool-version inputs still need manual review. SBOMs inventory components and do not establish trusted provenance. |

## Why the first five risks are the priority

**1. Exposed credentials**

This is the most urgent problem because around 40 people have repository access, including an external contractor. Anyone with access could potentially find and reuse exposed credentials.

Since it is not clear whether these credentials were also used in production, they must be treated as compromised. Changing them is more important than simply deleting the files.

**2. Unsafe pull requests**

The original CI configuration gave pull requests too much access. A malicious contributor could use the workflow to reach deployment credentials or modify repository content.

This security boundary must be fixed before adding more CI tools or features.

**3. Command injection**

The pull request title was inserted directly into a shell command. This created another way to execute unwanted commands inside CI.

Removing this command was a simple change that closed a separate attack path.

**4. Exposed debugger**

The Node.js debugger provides direct control over the running application. If someone can reach it, they may be able to take over the process.

Removing the debugger and its exposed ports is safer than trying to protect an unnecessary debugging service.

**5. Unsafe deployments**

Even after securing credentials and CI permissions, the deployment process must make sure that only tested images reach the cluster.

Tests and scans must block deployment when they fail. Using an image digest also makes sure the deployment refers to the exact image that was published.

## Exposed credentials: what needs to happen next

Removing credentials from the project is only the first step. Any credentials that were previously committed or printed in logs may still be usable.

The following actions are required.

**1. Immediate response – CTO and platform operator**

- Treat all exposed credentials as compromised.
- Identify every affected database password, API key, registry token and deployment token.
- Check whether the same credentials were reused in other environments.
- Review who had repository and contractor access.
- Restrict access where necessary.
- Keep records of the exposure and preserve audit logs in a secure location.

Do not copy passwords or tokens into tickets or reports.

**2. Change credentials – Database, API and registry administrators**

- Revoke exposed API keys and tokens.
- Change database passwords.
- Generate new registry and deployment credentials.
- Check which services depend on the old credentials.
- If a service needs a coordinated change, prepare the replacement first and revoke the old credential within a short, controlled period.

If there are signs of active misuse, revoke the affected credentials immediately.

Do not wait for Git history to be cleaned before changing passwords.

**3. Update the deployment – Platform and repository administrators**

- Store replacement credentials in the correct GitHub environments.
- Create the Kubernetes Secret named `stockdesk-env` outside Git.
- Update applications and services that use the old credentials.
- Restart the affected pods so they load the new values.
- Check that the application works with the new credentials.
- Confirm that the old credentials no longer work.

Changing a Kubernetes Secret does not automatically change the actual database password or update environment variables inside already-running pods.

**4. Investigate possible misuse – Incident owner and service owners**

Review the available logs and access records, including:

- Git repository access.
- GitHub Actions and CI logs.
- Application logs.
- Container registry activity.
- Kubernetes audit logs.

Also check whether kubeconfig files or other cluster credentials were exposed.

If necessary, rotate those credentials as well. Check inventory integrity and other connected services, not just whether the application starts successfully.

**5. Clean up the repository – Repository administrator**

- Remove sensitive files from the current project.
- Review Git history and decide whether it needs to be rewritten.
- Check old container images, build caches and stored logs.
- Follow the organisation's retention rules when cleaning up old artifacts.
- Inform people with existing clones or forks if they need to update their copies.

Cleaning Git history cannot invalidate credentials that were already copied. It can also affect other contributors, so it must be planned carefully.

**6. Final verification – CTO and platform owner**

Before considering the incident resolved:

- Confirm that old credentials have been revoked.
- Verify that new credentials work correctly.
- Check that repository and deployment permissions are restricted.
- Enable branch protection and environment restrictions.
- Enable secret scanning and review its results.
- Assign owners for the remaining security tasks.

**Important:** None of these external actions has been completed as part of this project submission. The work only covers changes made to the project files. The real credentials, GitHub settings, registry and Kubernetes cluster still need to be checked.