# Classifies agent `git commit` attempts in Claude Code transcripts since an ISO time.
# Usage: python3 -I measure-commits.py 2026-11-26T13:49:19Z

import json, glob, os, re, sys
since = sys.argv[1]  # ISO, station landed in eslint
rows = []
for f in glob.glob(os.path.expanduser('~/.claude/projects/-Users-ofri-repos-ofriperetz-dev-eslint*/*.jsonl')):

    uses, results = {}, {}
    try:
        for line in open(f, errors='replace'):
            try: e = json.loads(line)
            except Exception: continue
            ts = e.get('timestamp', '')
            c = (e.get('message') or {}).get('content')
            if not isinstance(c, list): continue
            for b in c:
                if b.get('type') == 'tool_use' and b.get('name') == 'Bash':
                    cmd = b.get('input', {}).get('command', '')
                    if re.search(r'\bgit commit\b', cmd) and ts >= since:
                        uses[b['id']] = (ts, cmd)
                elif b.get('type') == 'tool_result' and b.get('tool_use_id') in uses:
                    out = b.get('content')
                    if isinstance(out, list): out = ' '.join(x.get('text', '') for x in out if isinstance(x, dict))
                    results[b['tool_use_id']] = (bool(b.get('is_error')), out or '')
    except Exception: continue
    for k, (ts, cmd) in uses.items():
        err, out = results.get(k, (None, ''))
        m = re.search(r'Output is being written to: (\S+)', out)
        if m and os.path.exists(m.group(1).rstrip('.')): out = out + open(m.group(1).rstrip('.'), errors='replace').read()
        if err is None: kind = 'no-result'
        elif re.search(r'guard-bash:(hooked-timeout|no-verify|hooks-path)', out): kind = 'guard-deny-other'
        elif re.search(r'guard-bash:commit-message', out): kind = 'denied-early'
        elif 'commit-message' in out or 'Verified-by' in out and 'deny' in out.lower(): kind = 'denied-early'
        elif re.search(r'TS6305|stale-build|is older than', out): kind = 'stale'
        elif re.search(r'subject|scope-enum|footer-max|Verified-by', out) and ('✖' in out or err): kind = 'message'
        elif re.search(r'(^|\n)\[[^\]]+ [0-9a-f]{7,}\]|files? changed|(^|\n)[0-9a-f]{9} \w+\(', out) and not err: kind = 'ok'
        elif 'running in background' in out: kind = 'bg-unknown'
        elif err or re.search(r'✖|husky - |exit code [1-9]|EXIT=[1-9]', out): kind = 'failed-other'
        else: kind = 'ok'
        rows.append((ts, os.path.basename(os.path.dirname(f))[-20:], kind, out.strip().splitlines()[-1][:110] if out.strip() else ''))
rows.sort()
from collections import Counter
print(Counter(r[2] for r in rows))
for r in rows: print(' | '.join(r))
