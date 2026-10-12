# Run Kargo in Docker Desktop

This guide creates a local Kargo API server for plugin development. It follows the [Kargo quickstart](https://docs.kargo.io/quickstart) and runs on Docker Desktop.

## Requirements

- Docker Desktop.
- `kubectl` and `helm` 3.13.1 or later.
- Either Kubernetes enabled in Docker Desktop, or [`kind`](https://kind.sigs.k8s.io) for a disposable cluster.

## Option A: a disposable kind cluster

This path leaves the Docker Desktop settings unchanged and is easy to delete. It maps the Kargo NodePort to `localhost:31081`.

```sh
brew install kind

cat <<'KIND' > /tmp/kind-kargo.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: kargo-plugin
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 31081
        hostPort: 31081
KIND

kind create cluster --config /tmp/kind-kargo.yaml --wait 120s
```

`kind create cluster` switches the current kubectl context to `kind-kargo-plugin`. Pass `--context kind-kargo-plugin` to `kubectl` and `--kube-context kind-kargo-plugin` to `helm` if you also work with other clusters.

## Option B: Docker Desktop Kubernetes

Enable Kubernetes in the Docker Desktop settings and select the `docker-desktop` kubectl context.

## Install Kargo

The quickstart script installs cert-manager, Argo CD, Argo Rollouts, and Kargo. Kargo listens on `http://localhost:31081`. The admin password is `admin`.

```sh
curl -L https://raw.githubusercontent.com/akuity/kargo/main/hack/quickstart/install.sh | sh
```

If you want only Kargo, install cert-manager and then Kargo:

```sh
helm install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true --wait

helm install kargo oci://ghcr.io/akuity/kargo-charts/kargo \
  --namespace kargo --create-namespace \
  --set api.service.type=NodePort \
  --set api.service.nodePort=31081 \
  --set api.tls.enabled=false \
  --set api.adminAccount.passwordHash='$2a$10$Zrhhie4vLz5ygtVSaif6o.qN36jgs6vjtMBdM6yrU1FOeiAAMMxOm' \
  --set api.adminAccount.tokenSigningKey=iwishtowashmyirishwristwatch \
  --wait
```

The password hash above is the bcrypt hash of `admin` from the Kargo quickstart. Use your own hash and signing key for anything other than a throwaway cluster.

## Create a demo Project

Apply the resources below. They create a Project, a Warehouse that watches the public `nginx` image, and three Stages. Promotion steps are omitted, so the Stages do nothing when promoted. This is enough to exercise every plugin view.

```sh
kubectl apply -f docs/examples/kargo-demo.yaml
```

Kargo discovers Freight within a few minutes. Open `http://localhost:31081` and log in with `admin` to confirm.

## Point the plugin at it

```sh
export KARGO_URL=http://localhost:31081
export KARGO_ADMIN_PASSWORD=admin
yarn start
```

Then open the `example-website` component in the catalog. It carries the `kargo.akuity.io/project: kargo-demo` annotation.

To test only the backend:

```sh
KARGO_URL=http://localhost:31081 KARGO_ADMIN_PASSWORD=admin \
  yarn --cwd plugins/kargo-backend start
curl -s http://localhost:7007/api/kargo/projects/kargo-demo/stages | jq '.items[].metadata.name'
```

## Create a Promotion

The plugin is read-only. Use the Kargo UI, the `kargo` CLI, or the API to promote Freight so the Promotions table has data:

```sh
TOKEN=$(curl -s -X POST -H 'Authorization: Bearer admin' \
  http://localhost:31081/v1beta1/login | jq -r .idToken)
FREIGHT=$(kubectl get freight -n kargo-demo -o jsonpath='{.items[0].metadata.name}')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"freight\":\"$FREIGHT\"}" \
  http://localhost:31081/v1beta1/projects/kargo-demo/stages/test/promotions
```

## Clean up

With kind:

```sh
kind delete cluster --name kargo-plugin
```

With Docker Desktop Kubernetes:

```sh
helm uninstall kargo -n kargo
helm uninstall cert-manager -n cert-manager
kubectl delete namespace kargo-demo kargo cert-manager
```
