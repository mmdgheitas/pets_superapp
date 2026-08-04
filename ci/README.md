# CI configuration

`github-actions-ci.yml` — Backend (typecheck, build, 24 unit tests, Prisma
migrate against service MySQL/Redis) + Web (typecheck, build).

> ⚠️ This file is intentionally NOT under `.github/workflows/`: the automation
> token that pushed this branch lacks GitHub's `workflows` permission. To
> activate CI, a repo admin just moves it into place (or commits via the GitHub web UI):

```bash
mkdir -p .github/workflows
cp ci/github-actions-ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: enable GitHub Actions" && git push
```
