# Small, reviewable frontend commits

The update has five independent file groups and five ordered patches in the ZIP.
Each patch was checked against the preceding stage. No commit, push, Git identity
change or account switch is performed by the installer.

## Before committing

Check the intended author settings and review the staged content. From the project root:

```powershell
git status --short
git diff --cached --name-only
git config --get user.name
git config --get user.email
```

Commit frontend changes separately from backend work. Do not use `git add .`.
If unrelated files are already staged, finish or unstage those deliberately before
making these commits. A successful commit should describe its actual contents.

## Five groups

| Part | Paths under frontend | Suggested commit subject |
|---|---|---|
| 1 | src/styles/theme.css, src/components/UI.jsx, src/app/CaseShell.jsx, src/lib/domain.js, src/lib/api.js | feat(ui): introduce colourful return-desk theme and readable controls |
| 2 | src/components/ThreeScene.jsx, src/components/ParcelExperience.jsx, src/pages/Landing.jsx, src/pages/Graph.jsx, index.html, public/trail-mark.svg | feat(scene): animate parcel unboxing and evidence connections |
| 3 | src/pages/Overview.jsx, src/pages/Evidence.jsx | feat(case): simplify overview and compare colourful source records |
| 4 | src/pages/Investigation.jsx, src/pages/Tasks.jsx, src/pages/History.jsx | feat(workflow): present clear results and source-linked manual replies |
| 5 | package.json, package-lock.json, tests/*.mjs, docs/*.md | test(ui): cover responsive pages and preserve guest case workflows |

If the previous frontend is already tracked, you can install All for review, then
stage each group in order using exact paths and inspect `git diff --cached` before
committing. Alternatively, apply Part 1, review/test/commit, then Part 2, and so on.

Example for the first group, from the project root:

```powershell
git add -- frontend/src/styles/theme.css frontend/src/components/UI.jsx frontend/src/app/CaseShell.jsx frontend/src/lib/domain.js frontend/src/lib/api.js
git diff --cached --stat
git diff --cached
git commit -m "feat(ui): introduce colourful return-desk theme and readable controls"
```

Use the same pattern for the exact paths in each following row. Keep the commit
order because later pages use the shared components introduced in Part 1.

If frontend is currently entirely untracked, a file-only partial commit of the
final app can omit route dependencies. Establish a buildable commit of the existing
working frontend first, then apply the five redesign patches. Keep the route dependencies together in that baseline commit.
The five patches represent real, separately reviewable changes from the previous
workspace version.

## Apply one feature patch at a time

Stop Vite. From the extracted ZIP directory, for example:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Polish.ps1 -Part 1
```

Review the result, then proceed with Part 2, 3, 4 and 5. The installer checks prior
part files, validates the patch, backs up affected files, then runs build/lint.
Part 5 adds test scripts and runs the domain/API tests. A mismatch stops before
applying the patch. The All option installs the complete result directly.

After all intended commits:

```powershell
git log -5 --oneline
git status --short
git push origin main
```

Push only after reviewing the branch and the actual changes. No force push is needed.
