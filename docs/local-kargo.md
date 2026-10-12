# Run Kargo in Docker Desktop

This guide creates a local Kargo API server for plugin development. It follows the [Kargo quickstart](https://docs.kargo.io/quickstart) and uses the Kubernetes cluster built in to Docker Desktop.

## Requirements

- Docker Desktop with Kubernetes enabled.
- `kubectl` and `helm` 3.13.1 or later.

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

## Clean up

```sh
helm uninstall kargo -n kargo
helm uninstall cert-manager -n cert-manager
kubectl delete namespace kargo-demo kargo cert-manager
```
