---
title: "My Cloud Exit (Raspberry Pi Edition)"
date: 2026-01-14
slug: my-cloud-exit
---

# My Cloud Exit (Raspberry Pi Edition)

If you’ve ever worked with me, you know I’m extremely serverless pilled.

If you ask me what the right tool for the job is, 99 times out of 100 I’ll say: use the platform and spend your innovation tokens wisely.

So naturally, I decided to do the opposite.

I wanted to run my personal website at home, on my own hardware, in the UK. Not “in the cloud, but the region is London”. Like… actually in my house.

The temptation to do `wrangler deploy` and be done is enormous (Cloudflare is literally my employer and it is quite marvelous). But my friend [Sean Trace](https://smt.codes) gave me a Raspberry Pi, and that was enough to ruin my financial judgement.

This post is a guide for my friends who also want to do something deeply impractical: deploy their website to a Pi.

It’s not about cost savings. It’s about learning, vibes, and the joy of knowing your blog is running three meters from your kettle.

---

## The Architecture

What we’re building:

- A Raspberry Pi running Raspberry Pi OS
- `k3s` (lightweight Kubernetes)
- Your website as a container image (I’m using Bun)
- Traefik (ships with k3s) for LAN ingress
- Cloudflare Tunnel to expose it to the internet without port-forwarding

If that sounds like a lot: it is. But it’s also weirdly approachable.

---

## What You Need

Hardware:

- Raspberry Pi 4 or 5 recommended (4GB+ is necessary)
- MicroSD card (or SSD if you’re fancy)
- Ethernet is ideal, Wi-Fi works

Accounts:

- A domain on Cloudflare (Tunnel is easiest there)
- GitHub account (I push images to GHCR)

Laptop:

- Docker (or another container builder)

---

## Step 1: Flash the Pi

I’m not going to pretend I can explain a GUI installer better than a YouTube video.

Watch this and do exactly what they do:

https://www.youtube.com/watch?v=O4IQE2E8oOw

While you’re in Raspberry Pi Imager’s advanced settings, please do these two things (everything else is vibes):

- Set a hostname (I used `berry`)
- Enable SSH **with a public key** (password SSH is bad)

Pi Imager: paste your public key.

If you don’t know what that means, ask a friend.

(ps. your friend is me.)

Boot the Pi and SSH in:

```bash
ssh berry@berry.lan
```

First thing I do on a fresh Pi:

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

---

## Step 2: Install k3s

SSH back in after reboot:

```bash
ssh berry@berry.lan
```

Install k3s:

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
```

That `--write-kubeconfig-mode 644` bit is optional, but it makes life nicer because it lets you read `/etc/rancher/k3s/k3s.yaml` without sudo.

Check it’s alive:

```bash
sudo systemctl status k3s
kubectl get nodes
```

If k3s is working, you should see **one node** (your Pi) and after ~30 seconds it should go `Ready`.

### Make `kubectl` nice

If `kubectl get nodes` doesn’t work for you yet, don’t fight it.

Ask Claude to help you configure it properly, then add an alias so you can control the Pi cluster from your laptop.

Here’s the prompt I’d use:

```
I have a Raspberry Pi running k3s. I can SSH to it as `berry@berry.lan`.

I want `kubectl` on my laptop to talk to the Pi cluster without sudo.

Please give me exact commands to:
- copy the k3s kubeconfig from the Pi to my laptop
- fix the server address inside the kubeconfig (so it doesn’t point at 127.0.0.1)
- put it somewhere sensible under ~/.kube/
- add a zsh alias called `kpi` that uses this kubeconfig

Assume k3s kubeconfig lives at /etc/rancher/k3s/k3s.yaml
```

At this point I hit my first hurdle: k3s wasn’t starting.

Not “something is slightly misconfigured” not starting.

The kind where you stare at `systemctl status` like it’s going to apologize, and then you start bargaining with the universe.

So I did what every modern engineer does: copied the error, sent it to Claude, and pretended I understood the answer.

---

## Step 3: Enable cgroups (the “why isn’t this working” fix)

On Raspberry Pi OS, k3s sometimes needs memory cgroups enabled.

Instead of me explaining cgroups (and inevitably getting one detail wrong), just ask Claude directly.

Here’s the prompt:

```
I'm installing k3s on a Raspberry Pi 4 (Raspberry Pi OS). k3s fails to start and the error mentions cgroups / memory cgroups.

1) Explain what cgroups are in the context of Kubernetes.
2) Tell me exactly how to enable the required cgroup settings on Raspberry Pi OS.
3) Give me a safe, repeatable command sequence.
```

Once the AI has fixed your shit: `kubectl get nodes`. One node, probably `berry`, status `Ready`. Congrats — you run a tiny datacenter now.

---

## Step 4: Containerize the Site (and get mad at Node)

I started with a normal Node setup: TypeScript, Hono, `tsx`, Tailwind. Then I tried to write a Dockerfile and remembered why “JavaScript tooling” is a phrase that should come with a warning label.

I wrote a whole separate rant about this (including the before/after Dockerfiles): [Vertical Integration Wins](/blog/virtical-integration).

I switched to Bun so I could build a single binary with `bun build --compile`.

Here’s the Dockerfile I ended up with:

- https://github.com/ankcorn/ankcorn.dev/blob/main/Dockerfile

The big win: the final image has no `node_modules` and no Node runtime. Just a binary.

---

## Step 5: Build + Push the Image (GHCR)

I use GitHub Container Registry because it’s easy and I’m already on GitHub.

### Make the package public

Simplest option: make your GHCR package public.

Then your Pi can pull `ghcr.io/ankcorn/ankcorn.dev:latest` without any auth, secrets, or extra ceremony.

If you want to keep it private (fair), you’ll need to set up `imagePullSecrets` with a GitHub token. I’m not covering that here because this post is about getting your site online, not becoming an adult.

### Build + push in CI

This repo (`https://github.com/ankcorn/ankcorn.dev`) builds and publishes to GHCR on every push to `main`.

Workflow file:
- `https://github.com/ankcorn/ankcorn.dev/blob/main/.github/workflows/docker.yml`

It publishes a multi-arch image (`linux/amd64` + `linux/arm64`) so the same tag works on my Pi and on normal computers.

So the “deploy” loop becomes:

- push a commit
- wait for Actions to go green
- your cluster pulls `:latest`

---

## Step 6: Deploy the App

Create a file called `ankcorn-dev.yaml` on the Pi:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ankcorn-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ankcorn-dev
  template:
    metadata:
      labels:
        app: ankcorn-dev
    spec:
      containers:
        - name: ankcorn-dev
          image: ghcr.io/ankcorn/ankcorn.dev:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: ankcorn-dev
spec:
  type: ClusterIP
  selector:
    app: ankcorn-dev
  ports:
    - port: 3000
      targetPort: 3000
```

Apply it:

```bash
kubectl apply -f ankcorn-dev.yaml
kubectl get pods
kubectl get svc
```

If the Pod is `Running`, you’re cooking.

---

## Step 7: Local Ingress (LAN URL)

k3s ships with Traefik, so we can add a normal Kubernetes Ingress.

Append this to `ankcorn-dev.yaml`:

```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ankcorn-dev
spec:
  ingressClassName: traefik
  rules:
    - host: berry.lan
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ankcorn-dev
                port:
                  number: 3000
```

Re-apply:

```bash
kubectl apply -f ankcorn-dev.yaml
kubectl get ingress
```

Now, on your laptop (on the same network):

- Visit `http://berry.lan/`

---

## Step 8: Expose It to the Internet (Cloudflare Tunnel)

This is the final hurdle.

You could port-forward. You could configure firewalls. You could spend a weekend learning NAT traversal.

Or you could do what every sane person does: use Cloudflare Tunnel.

### 9.1 Create the tunnel

Follow Cloudflare’s doc:

https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/

At the end, you’ll get a tunnel token.

### 9.2 Store the token in Kubernetes

On the Pi:

```bash
kubectl create secret generic cloudflared-token \
  --from-literal=token="YOUR_TUNNEL_TOKEN"
```

### 9.3 Run cloudflared in the cluster

Create `cloudflared.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflared
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          args:
            - tunnel
            - --no-autoupdate
            - run
            - --token
            - $(TUNNEL_TOKEN)
          env:
            - name: TUNNEL_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cloudflared-token
                  key: token
```

Apply:

```bash
kubectl apply -f cloudflared.yaml
kubectl get pods
```

### 9.4 Point your hostname at the service

In the Cloudflare Tunnel dashboard, add a Public Hostname:

- Hostname: `yourdomain.com`
- Service: `http://ankcorn-dev:3000`

Because `cloudflared` runs inside your cluster, it can talk directly to the `ClusterIP` service by name.

Now your website is live.

### Bonus: sanity checks

A couple commands I always run right after:

```bash
kubectl get pods -o wide
kubectl logs deploy/ankcorn-dev --tail=50
kubectl logs deploy/cloudflared --tail=50
```

If something’s broken, 90% of the time it’s one of:

- wrong CPU architecture (`linux/arm64` vs `linux/amd64`)
- wrong image tag (you pushed `:pi` but deployed `:latest`)
- GHCR auth (secret is wrong / token expired)

---

## So, Was This Worth It?

Yes, in the only way hobby projects can be worth it.

What I got out of it:

- I’m now way more comfortable with Kubernetes primitives (Deployment/Service/Ingress/Secrets)
- I learned just enough networking to be dangerous
- Cloudflare Tunnel is basically magic
- AI help turned the tedious bits from hours to minutes without stealing the learning

What I did not get:

- High availability
- Convenience
- The ability to unplug the Pi without consequences

---

## Things To Do Next

I’m trying to keep this project from turning into a full-time job, but there are a few upgrades that are genuinely worth doing:

- Uptime monitoring
- Basic metrics 
- Analytics

None of this is required to get the site live. But it does make it feel like a Real System™.

---

## Cost / Benefit (aka “justify this to yourself”)

Costs:

- Raspberry Pi: ~£60–£100 depending on model/RAM (mine was a gift, so I paid in friendship)
- Electricity: a Pi sips power (call it ~£5–£15/year depending on your rates)

Alternatives:

- `wrangler deploy`: basically free
- A $5 VPS: boring and reliable

Benefits:

- Your website is literally made in the UK (your house)
- Your hardware, your rules
- You learn the stuff people pretend they learned

Cons:

- Your website goes down when you move the Pi
- Your website goes down when you accidentally unplug the Pi
- Your website goes down when you get cocky

---

## If You’re My Friend: Do This

If you’ve got a personal website, a Pi, and a mild desire to suffer for knowledge, I genuinely recommend this.

Start small:

- Don’t migrate your whole life
- Deploy something dumb first (a static page, a redirect, a tiny blog)
- Get it working on LAN
- Then add the Tunnel

And if you do it, message me.

I want a future where my friend group is just a bunch of lovely people casually running their websites on little computers in their living rooms.

That would be extremely stupid.

Which is how you know it’s the right idea.
