#!/usr/bin/env python3
"""MD-03: audit how the corrected cause classification moved episodes.

Compares the reviewed ledger (commit 0a6dcb8, availability_class) with the
corrected ledger (cause_class). The old ledger is read from an explicit path so
the audit is reproducible without git access:

  git show 0a6dcb8:research/md03/data/episode_ledger.json > OLD.json
  python -B research/md03/classification_migration.py OLD.json [--write]
"""
from __future__ import annotations
import json, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent


def eligible(e):
    return 1 <= e['missed'] <= 17 and bool(e['eval'])


def migrate(old_path):
    old = {e['id']: e for e in json.loads(Path(old_path).read_text(encoding='utf-8'))['episodes']}
    new = {e['id']: e for e in json.loads((HERE / 'data' / 'episode_ledger.json').read_text(encoding='utf-8'))['episodes']}
    moves = Counter()
    reasons = Counter()
    examples = {}
    for k in sorted(set(old) | set(new)):
        o, n = old.get(k), new.get(k)
        oc = o['availability_class'] if o else 'ABSENT'
        nc = n['cause_class'] if n else 'ABSENT'
        moves[f'{oc} -> {nc}'] += 1
        if oc == 'VERIFIED' and nc != 'VERIFIED_MEDICAL':
            if not n:
                why = 'episode no longer exists (role takeover or detector correction)'
            elif nc == 'ROLE_CHANGE':
                why = 'season-opener onset' if n['cause_flags']['season_opener_onset'] else 'healthy-not-starting week'
            elif n['cause_flags'].get('generic_reserve_only'):
                why = 'generic reserve code only (not a documented medical list)'
            else:
                why = f'reclassified {nc}'
            reasons[why] += 1
            examples.setdefault(why, []).append(k)
    old_v = {k for k, e in old.items() if e['availability_class'] == 'VERIFIED' and eligible(e)}
    new_v = {k for k, e in new.items() if e['cause_class'] == 'VERIFIED_MEDICAL' and eligible(e)}
    return {
        'old_ledger_episodes': len(old), 'new_ledger_episodes': len(new),
        'old_primary_verified': len(old_v), 'new_primary_verified_medical': len(new_v),
        'kept_in_primary': len(old_v & new_v), 'left_primary': len(old_v - new_v), 'joined_primary': len(new_v - old_v),
        'class_moves': dict(sorted(moves.items())),
        'reasons_old_verified_not_verified_medical': dict(sorted(reasons.items())),
        'examples': {k: v[:12] for k, v in sorted(examples.items())},
        'joined_primary_ids': sorted(new_v - old_v),
        'left_primary_ids': sorted(old_v - new_v),
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    res = migrate(sys.argv[1])
    txt = json.dumps(res, indent=1, sort_keys=True)
    if '--write' in sys.argv:
        (HERE / 'results' / 'classification_migration.json').write_text(txt + '\n', encoding='utf-8', newline='\n')
    print(txt)
