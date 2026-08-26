# 07. Git Version Control & Branching Strategy Masterclass

Welcome to the **Sunotal Git Version Control Master Guide**. This document provides an exhaustive, educational, and operational manual for Git version control, GitFlow branching workflows, commit conventions, revert strategies, and emergency production rollback runbooks.

---

## 📖 Table of Contents
1. [Git 101: Core Concepts for Beginners](#1-git-101-core-concepts-for-beginners)
2. [Industry-Standard GitFlow Branching Strategy](#2-industry-standard-gitflow-branching-strategy)
3. [Master Everyday Git Commands (CRUD Operations)](#3-master-everyday-git-commands-crud-operations)
4. [Conventional Commit Guidelines](#4-conventional-commit-guidelines)
5. [Reverting, Stashing & History Inspection](#5-reverting-stashing--history-inspection)
6. [Emergency Production Rollback Runbook](#6-emergency-production-rollback-runbook)

---

## 1. Git 101: Core Concepts for Beginners

### What is Git?
Git is a distributed version control system that tracks code modifications, enables collaborative software development across multiple team members, and maintains an immutable history of changes.

### Core Terminology
- **Repository (Repo)**: A directory containing project source code and `.git` version control history.
- **Commit**: A snapshot of modified files at a specific point in time identified by a unique 40-character SHA hash (e.g. `7e2b46a7`).
- **Branch**: An independent line of development extending from a commit history.
- **Merge**: Combining code changes from one branch into another (e.g. merging `feature/login` into `staging`).
- **Remote (`origin`)**: A centralized server hosting the Git repository (e.g. GitHub).

---

## 2. Industry-Standard GitFlow Branching Strategy

```
  [ main ] ─────────●───────────────────────────●─────────── (Production Environment)
                     \                         /
  [ staging ] ────────●─────────●─────────────●───────────── (Staging Integration)
                       \       /             /
  [ feature/* ] ────────●─────●─────────────/               (Feature Development)
                                           /
  [ hotfix/* ] ───────────────────────────●                 (Production Hotfixes)
```

### Branch Types & Lifecycles
1. **`main`**: Production-ready branch. Pushing to `main` triggers automated deployment to AWS EKS (`https://sunotal.automateuniverse.space`).
2. **`staging`**: Pre-production integration branch used by QA teams for testing.
3. **`feature/<feature-name>`**: Short-lived feature branch created from `staging` (e.g. `feature/razorpay-payments`).
4. **`hotfix/<issue>`**: Emergency production fix branch branched directly from `main` and merged into both `main` and `staging`.

---

## 3. Master Everyday Git Commands (CRUD Operations)

```bash
# 1. CREATE / CLONE
git clone https://github.com/valivarthi007/sunotal_fullstk.git
git checkout -b feature/farmer-payouts

# 2. READ / QUERY
git status
git log --oneline -n 10
git diff HEAD~1 HEAD

# 3. UPDATE / COMMIT / PUSH
git add backend/services/user-service/src/routes/vendors.ts
git commit -m "feat(user-service): add automated farmer payout verification endpoint"
git push -u origin feature/farmer-payouts

# 4. DELETE / CLEANUP
git branch -d feature/farmer-payouts
git push origin --delete feature/farmer-payouts
```

---

## 4. Conventional Commit Guidelines

Sunotal strictly enforces **Conventional Commits** syntax:

Format: `<type>(<scope>): <short summary>`

### Allowed Types
- **`feat`**: A new user-facing feature.
- **`fix`**: A bug fix.
- **`docs`**: Documentation updates only.
- **`style`**: Formatting changes (white-space, missing semi-colons, no code logic change).
- **`refactor`**: Code refactoring without adding features or fixing bugs.
- **`test`**: Adding missing tests or correcting existing tests.
- **`chore`**: Maintenance tasks, dependency updates, or pipeline configuration updates.

---

## 5. Reverting, Stashing & History Inspection

```bash
# 1. Stash Uncommitted Working Tree Modifications
git stash save "WIP: Admin dashboard layout updates"
git stash list
git stash pop

# 2. Revert a Specific Commit Safely
git revert 7e0b9f46 -m "revert: temporary rollout adjustment"
git push origin main

# 3. Inspect Commit History for a Specific File
git log -p -n 5 backend/services/auth-service/src/routes/auth.ts
```

---

## 6. Emergency Production Rollback Runbook

If a critical bug is pushed to `main` and breaks production:

```bash
# 1. Identify previous known-good commit SHA
git log --oneline -n 10

# 2. Hard reset local branch to known-good commit
git reset --hard 4438a2ad

# 3. Force push to main (Only during critical production emergency)
git push --force origin main
```
