# Git and GitHub Workflow

## Main Branch

`main`

Main should always represent the stable integrated project.

Do not directly develop features on main.

---

# Feature Branches

Examples:

feature/log-purchase
feature/my-stock
feature/create-lot
feature/recycler-matching
feature/qr-handover
feature/backend-sync
feature/recycler-profile
feature/ml-classifier

---

# Workflow

Pull latest main.

↓

Create feature branch.

↓

Implement feature.

↓

Run tests.

↓

Commit.

↓

Push branch.

↓

Create Pull Request.

↓

Person F reviews.

↓

Fix requested changes.

↓

Approve.

↓

Merge.

---

# Commit Guidelines

Prefer small meaningful commits.

Good:

feat: add dealer purchase form

fix: prevent duplicate purchase sync

feat: add lot creation

Bad:

final code

changes

everything

---

# Important

Do not use blind conflict resolution.

Do not automatically choose:

ours

or

theirs

without understanding the conflict.

Shared files require careful integration.