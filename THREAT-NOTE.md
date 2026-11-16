# Threat Analysis

**What needs to be protected:** Inventory data, database and API passwords, repository access, container images, deployment credentials, and workloads running on the shared cluster. The API is currently internal, but giving suppliers access introduces a new security risk.

**Possible attackers:** Someone with repository access, a former contractor, someone submitting a malicious pull request, a compromised third-party action or image, or another service that can reach the API. This does not mean that an attack has already happened.

### 1. Stolen credentials

Someone with access to the repository or CI logs could find passwords and tokens in `.env` files, Secret manifests, Docker Compose files, or configuration logs. They could then use them to access the database, API, or container registry.

To reduce this risk, credential files have been removed from the copy, example values are used, the build context is restricted, and configuration details are no longer printed in logs.

However, removing these files does not protect credentials that may have already been copied. Passwords and tokens must still be changed, and access must be checked.

### 2. Malicious pull requests

A person could submit a pull request containing malicious code or commands. If CI runs this code with too many permissions, it could expose deployment credentials or affect the delivery process.

To prevent this, normal pull request checks now use read-only permissions and do not have access to deployment secrets. Commands from pull request titles are no longer used directly in shell scripts. Only trusted jobs running from the main branch can publish and deploy.

Branch and environment protection must also be enabled. Approved code can still be dangerous if it is compromised, and untrusted pull requests can still use CI resources.

### 3. Access to the Node.js debugger

If someone can reach port 9229, they may be able to control the Node.js process through the debugger.

To reduce this risk, debugger startup and debug ports have been removed. The API Service is internal, and the development HTTP server only listens on localhost.

The container also runs as a non-root user, has fewer permissions, uses a read-only filesystem, and does not contain a mounted API token.

However, other workloads may still be able to reach the HTTP API. NetworkPolicy is deliberately not implemented pending verified traffic requirements and CNI support; no network isolation is claimed. Authenticated TLS access and separate permissions for each supplier are still needed.

### 4. Unsafe builds and deployments

A build could become unsafe if it uses a changed third-party action or image, or if tests fail but deployment continues anyway.

To reduce this risk, GitHub Actions and the base image are pinned to specific versions. Tests and security scans must pass before deployment. CI also passes the exact image digest to the deployment process.

This helps make sure that the deployed image is the same image that was checked and published. However, it does not prove that the image really came from a trusted publisher.

Image signatures, deployment admission rules, and pinning all tools used during the build are still future improvements.

### 5. Availability and business risks

Database problems now make the application fail its readiness check instead of its liveness check. This prevents the application from being treated as ready when the database is unavailable.

Resource limits also help control how much CPU and memory the application can use. However, they cannot completely prevent denial-of-service attacks.

There are still some important limitations:

- Inventory data is stored in memory and is lost when the application restarts.
- The database check only verifies whether a TCP connection is possible. It does not confirm that the database is fully working.
- The deployment uses one replica with the `Recreate` strategy, so updates can cause downtime.
- Durable storage is needed before running multiple replicas safely.

**Finally, no tests were performed on a live Kubernetes cluster, container registry, or running containers.** The changes were reviewed at configuration and code level, but their actual behaviour in a running environment has not been confirmed.
