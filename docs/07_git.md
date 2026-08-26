# 07. Git Version Control & Branching Strategy

This document details daily Git commands, enterprise GitFlow branching strategies, commit guidelines, revert workflows, and emergency rollback runbooks.

---

## 7.1 Industry-Standard GitFlow Branching Strategy

```
  [ main ] ─────────●───────────────────────────●─────────── (Production Environment)
                     \                         /
  [ staging ] ────────●─────────●─────────────●───────────── (Staging Integration)
                       \       /             /
  [ feature/* ] ────────●─────●─────────────/               (Feature Development)
                                           /
  [ hotfix/* ] ───────────────────────────●                 (Production Hotfixes)
```

### Branching Types
1. **`main`**: Production branch. Every commit to `main` automatically triggers the CI/CD pipeline (`ci.yml` & `cd.yml`) and deploys to EKS (`https://sunotal.automateuniverse.space`).
2. **`staging`**: Pre-production integration branch used for QA testing.
3. **`feature/<name>`**: Feature branches created from `staging` (e.g. `feature/payment-gateway`).
4. **`bugfix/<ticket>`**: Non-critical bug fix branches (e.g. `bugfix/admin-dashboard-loading`).
5. **`hotfix/<ticket>`**: Emergency production fix branches branched directly from `main` and merged into both `main` and `staging`.

---

## 7.2 Everyday Git Commands

```bash
# 1. Check Working Tree Status
git status

# 2. Fetch Latest Changes from Remote
git fetch origin

# 3. Create and Switch to New Feature Branch
git checkout -b feature/farmer-payouts

# 4. Stage Modified Files
git add backend/services/user-service/src/routes/vendors.ts

# 5. Commit with Conventional Commit Message Syntax
git commit -m "feat(user-service): add automated farmer payout verification endpoint"

# 6. Push Feature Branch to Remote
git push -u origin feature/farmer-payouts

# 7. Pull and Rebase Latest Main Branch
git pull --rebase origin main
```

---

## 7.3 End-to-End Git Operations, Reverting & Rollback Guide

### 1. Reverting a Specific Commit Safely
To undo a specific commit without altering history:

```bash
# Revert commit hash and create new revert commit
git revert 7e0b9f46 -m "revert: temporary rollout adjustment"
git push origin main
```

### 2. Emergency Production Rollback (Hard Reset to Previous Known-Good Commit)

```bash
# 1. Identify previous known-good commit SHA
git log --oneline -n 10

# 2. Reset local branch hard to good commit
git reset --hard a8a00935

# 3. Force push to main (Only during critical production emergency)
git push --force origin main
```

### 3. Generating Git Change Reports & Audit Logs

```bash
# Generate concise summary of commits between two tags/commits
git log --oneline a8a00935..7e0b9f46

# Generate statistics on modified lines per file
git diff --stat HEAD~5 HEAD
```
