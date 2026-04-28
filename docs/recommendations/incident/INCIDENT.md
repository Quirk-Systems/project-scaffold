# Incident Response

> An incident will happen. The question is whether you're prepared.
> The team that practices response handles real incidents better.
> Preparation isn't pessimism — it's what makes 3am survivable.

---

## Severity Levels

```
SEV-1 — Critical
  Full outage, data loss in progress, security breach
  Response: page immediately, 15min SLA

SEV-2 — High
  Major feature broken, >5x latency degradation
  Response: page on-call, 1hr SLA

SEV-3 — Medium
  Non-critical feature broken, elevated error rate
  Response: Slack notify, next business hours

SEV-4 — Low
  Minor issue, workaround available, no user impact
  Response: ticket, next sprint
```

---

## The Runbook

```
1. ACKNOWLEDGE
   → Acknowledge in PagerDuty. Breathe. Read the alert.

2. ASSESS
   → What is broken? (symptom, not cause)
   → Who is affected? (scope: all / subset / one customer)
   → When did it start? (check deploy timeline, graphs)
   → Is data at risk?

3. COMMUNICATE
   → Open #incident-YYYY-MM-DD-description in Slack
   → Post initial message (template below)
   → Assign: Incident Commander, Responders, Comms
   → Update status page

4. INVESTIGATE
   → Check logs (last deploy, errors, patterns)
   → Check dashboards (CPU, memory, DB connections, error rate)
   → Check recent changes (last SHA, config changes, cron jobs)
   → Narrow to root cause — don't treat symptoms

5. MITIGATE
   → First: reduce blast radius (route around, rate limit, maintenance mode)
   → Then: fix or rollback
   → Prefer reversible actions

6. RESOLVE
   → Confirm metrics back to baseline
   → Remove temporary mitigations
   → Post all-clear to status page + incident channel

7. FOLLOW UP
   → Postmortem within 48-72 hours
   → File follow-up tickets
   → Update runbooks
```

---

## Communication Templates

### Initial (within 5-15 min)
```markdown
🔴 **INCIDENT OPEN** — SEV-[1/2/3]
**Time detected:** HH:MM UTC
**IC:** @name
**Status:** Investigating

**What we know:**
- [symptom]
- [scope]
- [approximate start time]

**What we're doing:**
- [current steps]

**Next update:** HH:MM UTC
```

### Update (every 15-30 min for SEV-1/2)
```markdown
🟡 **INCIDENT UPDATE** — HH:MM UTC
**Status:** Investigating | Identified | Mitigating | Monitoring

**Latest:**
- [findings]
- [hypothesis / confirmed cause]

**Next steps:** [what now]
**ETA:** [estimate or "unknown"]
**Next update:** HH:MM UTC
```

### Resolution
```markdown
✅ **INCIDENT RESOLVED** — HH:MM UTC
**Duration:** X hours Y minutes
**Root cause:** [one sentence]
**Fix applied:** [what was done]
**Affected:** [scope]

Postmortem within 48 hours.
```

---

## Postmortem Template

```markdown
# Postmortem: [Short Title]

**Date:** YYYY-MM-DD | **Duration:** X hr Y min | **Severity:** SEV-N
**IC:** @name | **Authors:** @names | **Status:** Draft | Final

## Summary
What happened, how long, what was affected, how it was resolved.
Written for someone who wasn't in the incident.

## Impact
- Users affected: N / %
- Features affected: ...
- SLA breach: yes/no

## Timeline
| Time (UTC) | Event |
|-----------|-------|
| 14:23 | v2.14.3 deployed |
| 14:31 | Error rate spiked to 34% |
| 14:35 | On-call paged |
| 14:55 | DB connection pool exhaustion suspected |
| 15:10 | Confirmed: full table scan in new query |
| 15:22 | Rolled back to v2.14.2 |
| 15:28 | Error rate normal |

## Root Cause
Specific and technical. "Database was slow" is NOT a root cause.
"Payment query in v2.14.3 performed a full table scan on orders (12M rows)
due to missing index on user_id+status, exhausting connection pool" IS.

## Contributing Factors
- Query not tested against production-scale data
- Staging uses 1% of prod data
- No slow query alerting configured

## What Went Well
- Alerting fired within 8 minutes
- Rollback was smooth and practiced

## What Went Poorly
- Detection lag of 8 minutes
- Staging didn't surface the issue

## Action Items
| Action | Owner | Priority | Due |
|--------|-------|----------|-----|
| Add missing index | @bob | P1 | YYYY-MM-DD |
| Add slow query alerting | @carol | P1 | YYYY-MM-DD |

## No Blame
This postmortem is blameless. Incidents are system failures, not person failures.
```

---

## Useful Commands

```bash
# Recent deploys
git log --oneline -20

# DB: active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# DB: slow queries right now
SELECT pid, age(clock_timestamp(), query_start), left(query, 100)
FROM pg_stat_activity WHERE query != '<IDLE>' ORDER BY age DESC;

# Kill query
SELECT pg_cancel_backend(pid);

# Recent 5xx by endpoint
grep " 5[0-9][0-9] " /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn

# Disk space
df -h && du -sh /* 2>/dev/null | sort -rh | head -20

# K8s: restart service
kubectl rollout restart deployment/api -n production

# K8s: scale up
kubectl scale deployment/api --replicas=5 -n production

# K8s: rollback
kubectl rollout undo deployment/api -n production
```

---

## On-Call Health

```
Sustainable:
  → < 2 significant pages per shift
  → < 10% of time on incidents per week
  → Clear escalation — no single point of failure

Toil reduction:
  → Same alert fires 3+ times → dedicated fix sprint
  → Automate mitigations (auto-restart, auto-scale)

Culture:
  → Rotate frequently — no hero culture
  → Debrief after every SEV-1/2
  → Never blame people. Fix systems.
```

---

## Resources

- [PagerDuty Incident Response Guide](https://response.pagerduty.com)
- [Google SRE Book Ch. 12-14](https://sre.google/sre-book/table-of-contents/)
- [Instatus](https://instatus.com) — status page
