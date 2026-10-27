#!/usr/bin/env bash
# Checks that a template folder has the files Hermes needs and that its
# STARTER.md front matter agrees with hermes-app.json and the folder name.
set -euo pipefail

dir="${1:?usage: check-template.sh <template-folder>}"
id="$(basename "$dir")"

for file in STARTER.md hermes-app.json LICENSE; do
  [ -f "$dir/$file" ] || { echo "$id: missing $file" >&2; exit 1; }
done

front="$(awk 'NR==1 && $0!="---" {exit 1} NR>1 && $0=="---" {exit} NR>1 {print}' "$dir/STARTER.md")" \
  || { echo "$id: STARTER.md must start with --- front matter" >&2; exit 1; }

field() { printf '%s\n' "$front" | sed -n "s/^$1: *//p" | head -n 1; }
for key in id version summary use_when; do
  [ -n "$(field "$key")" ] || { echo "$id: STARTER.md front matter lacks $key" >&2; exit 1; }
done

[ "$(field id)" = "$id" ] || { echo "$id: front matter id is '$(field id)'" >&2; exit 1; }
expected="$id@$(field version)"
declared="$(sed -n 's/.*"template" *: *"\([^"]*\)".*/\1/p' "$dir/hermes-app.json")"
[ "$declared" = "$expected" ] || { echo "$id: hermes-app.json says '$declared', expected '$expected'" >&2; exit 1; }

echo "$id: ok ($expected)"
