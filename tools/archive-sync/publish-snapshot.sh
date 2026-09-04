#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
RUNNER_TMP="${RUNNER_TEMP:-/tmp}"
SNAPSHOT_DIR="$RUNNER_TMP/scp-archive-snapshot"
WORKTREE_DIR="$RUNNER_TMP/scp-archive-worktree"
TEMP_BRANCH="archive-snapshot-temp-${GITHUB_RUN_ID:-local}-${RANDOM}"

cleanup() {
  git -C "$ROOT" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true
  rm -rf "$SNAPSHOT_DIR"
}
trap cleanup EXIT

rm -rf "$SNAPSHOT_DIR" "$WORKTREE_DIR"
mkdir -p "$SNAPSHOT_DIR/public"
cp -R "$ROOT/public/archive" "$SNAPSHOT_DIR/public/archive"
cp "$ROOT/LICENSE.md" "$SNAPSHOT_DIR/LICENSE.md"

git -C "$ROOT" config user.name "github-actions[bot]"
git -C "$ROOT" config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Keep the synchronized files in the main checkout untouched. The orphan
# snapshot branch is created only inside this clean, disposable worktree.
git -C "$ROOT" worktree add --detach "$WORKTREE_DIR" HEAD
cd "$WORKTREE_DIR"
git switch --orphan "$TEMP_BRANCH"
cp -R "$SNAPSHOT_DIR/." .
git add -f public/archive
git add LICENSE.md
git commit -m "chore: refresh SCP archive snapshot"
git push --force origin HEAD:archive-snapshot
