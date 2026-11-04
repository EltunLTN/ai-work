# Complimentary text-token configuration

Requested model: GPT-5.4 Mini, pinned to `gpt-5.4-mini-2026-03-17`.
The owner reported replacing `OPENAI_API_KEY` in Vercel Production and Preview
with a key from the organization enrolled in data sharing. Never put the key
in source, client variables, screenshots, chat, or logs.

## Application controls

- Every inference path, including the admin model test, goes through `lib/ai/budget.ts`.
- Only the pinned model, plain text messages, standard service and bounded output
  are accepted. Tools, images, stored conversations, background jobs, automatic
  SDK retries and model fallbacks are rejected before inference.
- Paid web discovery is removed, regardless of the old environment flag.
  Lesson links come from the reviewed resource catalog. Missing links stay missing.
- Older deployments are denied by the shared per-account AI quota RPC unless they
  provide both current server attestation and the budget integration version.
- Before inference, a server-attested Supabase RPC atomically reserves twice the
  UTF-8 request bytes, framing allowance and maximum output (including reasoning).
  Reservations are never refunded, even on cancellation or uncertain upstream errors.
- The database enforces a shared 2,000,000 reserved-token ceiling per UTC day,
  across all users, deployments and Production/Preview environments. It is below
  the owner's reported 2,500,000-token Mini-group incentive limit.
- Requests stop on DB/configuration failure and from 23:55 through 00:05 UTC.
  The initial start is the next UTC day after installation, avoiding unknown
  earlier usage on the installation day. Baku restart time is 04:05.
- Admin `/admin` shows conservative reservations, not measured provider usage.
  No prompt text, outputs, user IDs or IP addresses are stored in budget tables.

## Organization requirements and limits

This application counter cannot verify OpenAI enrollment, account balances,
program changes, or traffic from other applications in the same organization.
It is not an organization-wide billing hard cap and cannot guarantee zero charges
if those conditions change. Do not use other keys/projects in this organization
to consume the shared Mini-group allowance without reducing the application cap.
Never automatically switch to GPT-5.4: it uses a separate, much smaller allowance.

The owner must keep eligible traffic sharing enabled for the key's project and
check the OpenAI Usage dashboard's data-sharing incentive service tier and Costs.
An entire request crossing the provider limit can be billed. Tool fees are separate.
A positive provider balance is required even for the incentive program. This release
does not add credit, enable automatic recharge, or alter provider billing settings.

Shared AI inputs/outputs may be used to improve/train provider models. The privacy
page discloses this; account credentials are never included in model context.

## Operations

`private.ai_complimentary_policy` is locked to database operators. `enabled=false`
is the immediate kill switch. Keep `daily_limit<=2000000`; a database constraint
enforces this. New deployments cannot reset usage. Do not clear usage/reservation
rows during a UTC day. Keep the server attestation secret server-only.

Validation: isolated provider mocks (no billable calls), full app tests/lint/type
check, and database rollback tests for attestation, disabled policy, invalid model,
null/duplicate requests, exact cap and exhaustion. No live inference is run on the
installation day because the organization's already consumed allowance is unknown.

Official references:
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/pricing
- https://help.openai.com/en/articles/10306912-sharing-feedback-evaluation-and-fine-tuning-data-and-api-inputs-and-outputs-with-openai
