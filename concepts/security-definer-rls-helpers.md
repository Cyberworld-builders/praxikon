---
topic: programming/database-security
canonical_terms: [SECURITY DEFINER, SECURITY INVOKER, row-level security, RLS recursion, search_path lockdown, privilege escalation, least privilege, STABLE function volatility, setuid analog]
---

# SECURITY DEFINER helpers for RLS recursion (and how to harden them)

## The one-liner
A Row-Level Security policy that needs to consult a *second* table whose own RLS keys on the same predicate will recurse (or worse, double-evaluate RLS per row). The standard escape hatch is a `SECURITY DEFINER` helper that runs as the function's owner and bypasses RLS on the joined table. The function is load-bearing authorization plumbing — and a sharp tool that, misused, becomes a privilege-escalation primitive.

## The recursion problem
Two tables: `customer_users(user_id, customer_id)` links each auth user to one customer; `po_hardware_items(job_id, …)` is read by customers, scoped to rows whose job's `customer_id` matches the caller's. A naive RLS policy on `po_hardware_items`:

```sql
USING (job_id IN (SELECT j.id FROM jobs j WHERE j.customer_id = (
    SELECT customer_id FROM customer_users WHERE user_id = auth.uid()
)))
```

Reading `customer_users` from inside this policy triggers `customer_users`'s own RLS. If *that* policy keys on `auth.uid()` and needs to read `customer_users` again to decide — recursion. Even when the engine cuts the recursion, every read of `po_hardware_items` now runs a second RLS pass over `customer_users`. Correctness *and* performance hazard.

## The escape hatch
A `SECURITY DEFINER` function bypasses RLS on tables it reads because **it runs as its owner, not as the caller.** RLS applies to non-owners (unless `FORCE ROW LEVEL SECURITY` is set, which is mutually exclusive with this design).

```sql
CREATE OR REPLACE FUNCTION public.current_user_customer_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT customer_id FROM public.customer_users WHERE user_id = auth.uid() LIMIT 1;
$$;
```

The policy on `po_hardware_items` now calls `current_user_customer_id()` instead of subquerying `customer_users` directly. The function reads as `postgres` (the owner), no recursion, no second RLS pass.

## Why this is a sharp tool — the hardening pattern

`SECURITY DEFINER` is the SQL equivalent of running with elevated privileges. The Unix analog is `setuid root`: a privileged operation handed to an unprivileged caller. Three things you must do, or you've handed yourself a privilege-escalation primitive:

1. **`SET search_path TO 'public'`** (or an explicit schema list — never empty, never include `pg_temp`).
   Without an explicit search_path, the caller can pre-set their session `search_path` so `public.customer_users` resolves to *their own* table (or a malicious schema). Then the function runs *their* SQL with *postgres* privileges. This is the canonical SECURITY DEFINER attack. **A SECURITY DEFINER function with no explicit search_path is a CVE waiting to happen.** Fully qualify every schema reference inside the body for defense in depth.

2. **`STABLE` (or `IMMUTABLE`), not `VOLATILE`.**
   `STABLE` declares the function won't modify the DB and returns the same value within a single query. The planner can then call it once per query rather than per row. For an RLS helper called on every row of every customer-facing query, this is a 10–100× perf difference. `VOLATILE` (the default) is correctness-safe but performance-disastrous in this role.

3. **Identity from `auth.uid()` inside, never a parameter.**
   If you accepted a `user_id` parameter, any caller could ask "what is *anyone else's* customer_id?" and the function would dutifully answer with `postgres` privileges. Always read identity from the running session's JWT.

**Bonus hardening:** narrow `GRANT EXECUTE` to `authenticated` only. `anon` (unauthenticated) has `auth.uid() = NULL` so the function returns NULL — harmless, but granting to `anon` or `PUBLIC` is sloppy. Defense in depth.

## Canonical adjacencies

- **`SECURITY INVOKER`** (default): function runs as caller; RLS applies normally. Use for helpers that should *respect* RLS, not bypass it.
- **`FORCE ROW LEVEL SECURITY`**: applies RLS even to the table owner; defeats the SECURITY DEFINER bypass. Don't combine them on the same table unless you mean to.
- **`pg_temp` in search_path** is an unfix: the attacker creates a temp table with the name of a table/function your code references; yours runs theirs. Never include `pg_temp`.
- **`setuid` / `setgid` binaries (Unix)** — same hazard category, same mitigations: scrub the caller's environment (`LD_LIBRARY_PATH`, `PATH` → SQL's `search_path`) before doing anything privileged.
- **OAuth `client_credentials` flow** — same conceptual move at the API layer: a privileged credential exercised on behalf of an unprivileged caller; must constrain scope.

## How to do it right (the checklist)

When you write a `SECURITY DEFINER` function, check every box:

- [ ] Owner is `postgres` (or whichever role you trust to bypass RLS), not the deploying user.
- [ ] `STABLE` or `IMMUTABLE` set (planner can inline; perf matters at RLS scale).
- [ ] `SET search_path TO 'public'` (or explicit schema list; never empty, never includes `pg_temp`).
- [ ] All schema references in the body are fully qualified (`public.customer_users`, not `customer_users`).
- [ ] Identity read from `auth.uid()` (or current session), never from a parameter.
- [ ] `GRANT EXECUTE` narrowed to `authenticated`; not `PUBLIC`/`anon` unless deliberate.
- [ ] Function does the *minimum* needed for the bypass — no piggybacked unrelated logic (smaller blast radius if a future bug emerges).

## Adjacent traps

- **`SECURITY DEFINER` view** with `security_invoker=false` (legacy default): same bypass risk; same care required when authoring its predicate.
- **Chains of `SECURITY DEFINER` calling another `SECURITY DEFINER`**: now you have two privilege contexts to reason about. Avoid.
- **Logging inside the function**: anything that writes to a table (audit log, last-seen) defeats `STABLE` and creates a new RLS surface to think about. Separate concerns.

## Self-check questions

- Why doesn't `SECURITY INVOKER` solve the RLS recursion problem on its own?
- What attack does `SET search_path TO 'public'` prevent? Walk through one specific exploit, end to end.
- Why is `STABLE` on this kind of helper a correctness *and* performance concern?
- A teammate writes a SECURITY DEFINER helper that takes a `user_id` parameter. What's wrong with it? How does the fix differ from the search_path concern?
- You see a SECURITY DEFINER granted to `PUBLIC`. Is that exploitable in itself, or only in conjunction with another bug?
