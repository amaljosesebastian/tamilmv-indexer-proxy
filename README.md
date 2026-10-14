# TamilMV Indexer Proxy

A small self-hosted service that turns TamilMV search results into a **Torznab** feed, so that **Prowlarr**, **Radarr** and other \*arr apps can search it like any other indexer.

```
Radarr  ──►  Prowlarr  ──►  TamilMV Indexer Proxy  ──►  TamilMV
          (Torznab)            (this project)
```

> **Fork notice:** this project is a fork of [TamilMV-Torznab-Proxy](https://github.com/febinbaiju/TamilMV-Torznab-Proxy) by Febin Baiju, released under the ISC license.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
  - [Pull the image](#pull-the-image)
  - [Option A: Docker Compose (recommended)](#option-a-docker-compose-recommended)
  - [Option B: Docker run](#option-b-docker-run)
- [First-time setup](#first-time-setup)
- [Add to Prowlarr](#add-to-prowlarr)
- [Add to Radarr](#add-to-radarr)
- [Configuration](#configuration)
- [Updating](#updating)
- [Build from source](#build-from-source)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Disclaimer](#disclaimer)
- [License and credits](#license-and-credits)

---

## Features

- Torznab-compatible API, works with Prowlarr, Radarr and Jackett-style clients
- Web settings page to change the TamilMV domain without rebuilding or restarting
- Settings stored in a small SQLite database that survives container updates
- Multi-architecture Docker image (`amd64` and `arm64`), runs as a non-root user
- Built-in health check

---

## Quick start

You need [Docker](https://docs.docker.com/get-docker/) installed. Pick **one** of the options below.

### Pull the image

The image is published on two registries. Use whichever you prefer, they are identical.

**GitHub Container Registry (GHCR):**

```bash
docker pull ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest
```

**Docker Hub:**

```bash
docker pull amaljosesebastian/tamilmv-indexer-proxy:latest
```

Docker automatically picks the right build for your CPU (`amd64` for normal PCs and servers, `arm64` for Raspberry Pi 4/5 and Apple Silicon).

**Pin a specific version** (recommended for stable setups) by replacing `latest` with a release number:

```bash
docker pull ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:1.0.0
```

**Check that it downloaded:**

```bash
docker images | grep tamilmv-indexer-proxy
```

You don't have to pull manually. `docker compose up -d` and `docker run` download the image automatically if it isn't on your machine yet. Pulling first is useful to check that the image is reachable, or to update to the newest version.

> **`denied` or `unauthorized` error?** The package may not be public yet. If you are the maintainer, set the package visibility to **Public** in GitHub (Profile → Packages → tamilmv-indexer-proxy → Package settings).

### Option A: Docker Compose (recommended)

**1. Create a folder and a `docker-compose.yml` file:**

```bash
mkdir tamilmv-indexer-proxy && cd tamilmv-indexer-proxy
nano docker-compose.yml
```

**2. Paste this in:**

```yaml
services:
  tamilmv-indexer-proxy:
    image: ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest
    container_name: tamilmv-indexer-proxy
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - TZ=UTC
      - TAMILMV_URL=https://www.1tamilmv.cards
    volumes:
      - tamilmv-data:/app/database
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

volumes:
  tamilmv-data:
```

**3. Start it:**

```bash
docker compose up -d
```

**4. Check that it's running:**

```bash
docker compose logs -f
```

You should see:

```
Connected to the tamilmv manager database.
Server has been started at port 5000
```

**5. Test the API:**

```bash
curl "http://localhost:5000/api?t=caps"
```

You should get XML back that lists a **Movies** category (ID `2000`).

#### Already have a compose file for Prowlarr and Radarr?

Add this service to your existing file (under `services:`). Containers in the same compose file can reach each other by service name, so Prowlarr can use `http://tamilmv-indexer-proxy:5000`.

```yaml
  tamilmv-indexer-proxy:
    image: ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest
    container_name: tamilmv-indexer-proxy
    environment:
      - TAMILMV_URL=https://www.1tamilmv.cards
    volumes:
      - ./config/tamilmv:/app/database   # or a named volume, see below
    ports:
      - 5000:5000                        # optional, only needed for the settings page
    restart: unless-stopped
```

Then start just this service so your other containers aren't touched:

```bash
sudo chown -R 1000:1000 ./config/tamilmv   # only needed for a folder (bind mount)
docker compose up -d tamilmv-indexer-proxy
```

> **Use `image:`, not `build:`.** The `build:` option expects a folder or a Git URL. Putting an image name there (for example `build: amaljosesebastian/tamilmv-indexer-proxy:latest`) will not work.
>
> **Named volume instead of a folder?** Use `tamilmv-data:/app/database` and add `volumes:` / `tamilmv-data:` at the bottom of the file. Docker then sets the right permissions automatically, so no `chown` is needed.

### Option B: Docker run

```bash
docker run -d \
  --name tamilmv-indexer-proxy \
  --restart unless-stopped \
  -p 5000:5000 \
  -e TAMILMV_URL=https://www.1tamilmv.cards \
  -v tamilmv-data:/app/database \
  ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest
```

Also available on Docker Hub: `amaljosesebastian/tamilmv-indexer-proxy:latest`

> **Using a folder instead of a named volume?** The container runs as user ID `1000`, so give that user access first:
>
> ```bash
> mkdir -p ./data && sudo chown -R 1000:1000 ./data
> ```
>
> then use `-v ./data:/app/database` (or `./data:/app/database` in compose).

---

## First-time setup

Open the settings page in your browser:

```
http://<your-server-ip>:5000/
```

Here you can check or change the **TamilMV URL**. TamilMV changes its domain often, so if searches suddenly stop working, this is the first place to look.

<!-- SCREENSHOT: settings page -->
<!-- ![Settings page](docs/images/settings-page.png) -->

> **Note:** the `TAMILMV_URL` environment variable is only used the **first time** the database is created. After that, change the URL on the settings page.

---

## Add to Prowlarr

In Prowlarr go to **Indexers → Add Indexer**, search for **Generic Torznab**, and select it.

<!-- SCREENSHOT: choosing Generic Torznab -->
<!-- ![Prowlarr: choose Generic Torznab](docs/images/prowlarr-01-generic-torznab.png) -->

Fill in the form:

| Field | Value |
|---|---|
| **Name** | `TamilMV` |
| **Enable RSS** | Off (recommended, see [limitations](#known-limitations)) |
| **URL** | `http://tamilmv-indexer-proxy:5000` if Prowlarr runs in the same Docker network.<br>Otherwise `http://<your-server-ip>:5000`. Do **not** use `localhost` if Prowlarr runs in Docker. |
| **API Path** | `/api` |
| **API Key** | anything, for example `x` (the proxy doesn't check it) |
| **Categories** | tick **Movies (2000)** |

<!-- SCREENSHOT: filled-in indexer form -->
<!-- ![Prowlarr: indexer settings](docs/images/prowlarr-02-indexer-settings.png) -->

Click **Test**. The first test can take 10 to 30 seconds because the proxy has to fetch pages from TamilMV. When it shows a green check, click **Save**.

<!-- SCREENSHOT: successful test -->
<!-- ![Prowlarr: test succeeded](docs/images/prowlarr-03-test-ok.png) -->

**Try a search:** open **Search** in Prowlarr, pick TamilMV, and search for a movie title.

<!-- SCREENSHOT: search results in Prowlarr -->
<!-- ![Prowlarr: search results](docs/images/prowlarr-04-search-results.png) -->

---

## Add to Radarr

### Step 1: Connect Prowlarr to Radarr

If you haven't already, in Prowlarr go to **Settings → Apps → Add (+) → Radarr**:

| Field | Value |
|---|---|
| **Prowlarr Server** | `http://prowlarr:9696` |
| **Radarr Server** | `http://radarr:7878` |
| **API Key** | from Radarr: **Settings → General → API Key** |

Click **Test**, then **Save**. Prowlarr now pushes TamilMV into Radarr automatically.

<!-- SCREENSHOT: Prowlarr Apps page -->
<!-- ![Prowlarr: Apps settings](docs/images/radarr-01-prowlarr-apps.png) -->

### Step 2: Check the indexer arrived in Radarr

In Radarr open **Settings → Indexers**. You should see **TamilMV (Prowlarr)** in the list.

<!-- SCREENSHOT: Radarr indexer list -->
<!-- ![Radarr: indexer list](docs/images/radarr-02-indexers.png) -->

### Step 3: Make sure Radarr has a download client

Radarr needs a download client (qBittorrent, Transmission, Deluge and so on) in **Settings → Download Clients** to actually fetch what it finds.

<!-- SCREENSHOT: Radarr download client -->
<!-- ![Radarr: download client](docs/images/radarr-03-download-client.png) -->

> **Download client behind a VPN container (gluetun)?** If the client shares gluetun's network, use `gluetun` as the host in Radarr and add it to the client's host whitelist.

### Step 4: Test with an interactive search

Open any movie in Radarr, click **Search** (the magnifier icon with a person), and look for TamilMV results.

<!-- SCREENSHOT: Radarr interactive search -->
<!-- ![Radarr: interactive search](docs/images/radarr-04-interactive-search.png) -->

If results appear, you're done.

---

## Configuration

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `TAMILMV_URL` | `https://www.1tamilmv.cards` | Initial TamilMV domain. Only read when the database is first created. |
| `TZ` | `UTC` | Time zone for logs. |

### Ports and volumes

| Item | Value | Purpose |
|---|---|---|
| Port | `5000` | Torznab API (`/api`) and the settings page (`/`) |
| Volume | `/app/database` | SQLite settings database. Keep it persistent. |

### Torznab endpoints

| Request | Purpose |
|---|---|
| `/api?t=caps` | Capabilities (also a quick health check) |
| `/api?t=search&q=<title>` | General search |
| `/api?t=movie&q=<title>` | Movie search |

---

## Updating

**Docker Compose:**

```bash
docker compose pull
docker compose up -d
```

**Docker run:**

```bash
docker pull ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest
docker stop tamilmv-indexer-proxy && docker rm tamilmv-indexer-proxy
# then run the same `docker run` command again
```

Your settings are kept because they live in the volume.

---

## Build from source

```bash
git clone https://github.com/amaljosesebastian/tamilmv-indexer-proxy.git
cd tamilmv-indexer-proxy
docker build -t tamilmv-indexer-proxy:local .
docker run --rm -p 5000:5000 -v tamilmv-data:/app/database tamilmv-indexer-proxy:local
```

Or let Docker Compose build it straight from GitHub:

```yaml
services:
  tamilmv-indexer-proxy:
    build: https://github.com/amaljosesebastian/tamilmv-indexer-proxy.git#main
    ports:
      - "5000:5000"
    volumes:
      - tamilmv-data:/app/database

volumes:
  tamilmv-data:
```

---

## Troubleshooting

| Problem | What to try |
|---|---|
| Prowlarr **Test** fails with a connection error | Check the URL. Inside Docker use the container name (`http://tamilmv-indexer-proxy:5000`), not `localhost`. Make sure both containers share a Docker network. |
| Test fails or times out | The proxy fetches pages from TamilMV, so it can be slow. Check `docker logs tamilmv-indexer-proxy`. If you see `521` or connection errors, the TamilMV domain has probably changed. Update it on the settings page. |
| Searches return nothing | TamilMV's domain may have changed, or its page layout may have changed. Check the logs. |
| `SQLITE_CANTOPEN` or "readonly database" on start | The data folder isn't writable by user `1000`. Run `sudo chown -R 1000:1000 ./data`, or use a named volume. |
| Radarr finds nothing automatically but **Interactive Search** works | Radarr is rejecting release names it can't parse. Grab releases manually from Interactive Search. |
| Pull fails with `denied` or `unauthorized` | Make sure you're using the right image name and that the package is public. |
| `pull access denied for tamilmv-proxy` (or another local-looking name) | Your compose file has an `image:` name that only exists on your machine, or a `build:` line with an image name. Replace both with a single `image: ghcr.io/amaljosesebastian/tamilmv-indexer-proxy:latest` line. |
| Container restarts right after switching from an older image | The old data folder is owned by `root`. Run `sudo chown -R 1000:1000 ./config/tamilmv` and start the container again. |

Still stuck? Open an [issue](https://github.com/amaljosesebastian/tamilmv-indexer-proxy/issues) and include the output of `docker logs tamilmv-indexer-proxy`.

---

## Known limitations

- **Movies only.** Use it with Radarr, not Sonarr.
- **Only the first word of a search is used.** For example, "Leo 2023" searches for "Leo". Radarr filters the extra results by year and quality.
- **Titles in non-Latin scripts are skipped.**
- **Seeders and leechers are not real.** They are always reported as a fixed number, so \*arr apps can't tell a healthy torrent from a dead one.
- **Low-quality releases are filtered out** (720p and below, plus CAM and PreDVD-style releases).
- **RSS sync is not useful.** The proxy has no real "latest releases" feed, so keep RSS disabled for this indexer in Prowlarr.
- **The scraper depends on TamilMV's page layout.** If the site changes its structure, the scraper may need an update.
- **Do not expose port 5000 to the internet.** The proxy has no authentication.

---

## Disclaimer

This project is a technical tool that converts search results into a standard feed format. It does not host, store or distribute any content. You are solely responsible for how you use it and for complying with the laws that apply to you and with the terms of any service you access. The authors accept no liability for misuse.

---

## License and credits

Released under the [ISC License](LICENSE).

- Original project: [TamilMV-Torznab-Proxy](https://github.com/febinbaiju/TamilMV-Torznab-Proxy) by Febin Baiju
- Fork maintained by [@amaljosesebastian](https://github.com/amaljosesebastian)