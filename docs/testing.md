# Test suite map and remaining improvements

Last inventoried: 2026-08-19

This document maps every executable test currently collected by Vitest and Cargo. Parameterized tests are counted after expansion. The coverage assessment follows [`testing-guidelines.md`](./testing-guidelines.md): financial and database invariants belong primarily in Rust, command contracts in integration tests, UI behavior in component/store tests, and only critical full-stack journeys in E2E.

## Suite summary

| Layer                         | Command                                          |   Cases | Main responsibility                                                       |
| ----------------------------- | ------------------------------------------------ | ------: | ------------------------------------------------------------------------- |
| Frontend unit/component/store | `pnpm test`                                      |     331 | UI behavior, form state, store indexes/caches, frontend helpers           |
| Tauri command integration     | `pnpm test:integration`                          |      60 | Command serialization, persistence, representative failures               |
| E2E                           | `pnpm test:e2e`                                  |      17 | Critical full-stack user journeys                                         |
| Rust unit/database            | `cd src-tauri && cargo test -- --test-threads=1` |     141 | Validation, calculations, transactions, balances, recurrence, persistence |
| **Total**                     |                                                  | **549** |                                                                           |

`vitest list` and `cargo test -- --list` were used for the inventory. A listed test is not necessarily a passing test; use the commands above for the current result.

## Verification status

Last full local verification on 2026-08-19:

- Frontend: 54 files and 331 tests passed.
- Rust: 141 tests passed with one test thread.
- Tauri integration: 7 files and 60 tests passed.
- E2E: 6 files and 17 independent tests passed without fixed sleeps or shared scenario databases.
- Astro production build passed.
- Static analysis: `pnpm check` passed with 0 errors, 0 warnings, and 0 hints and is required in CI.

## Frontend unit, component, hook, and store tests (331)

Each entry below maps all cases collected from that file. Numbers in parentheses are executable case counts.

### Accounts

- `src/components/Accounts/ActionButtons.test.tsx` (2): calls store removal after delete confirmation; navigates back after deletion.
- `src/components/Accounts/AccountCard.test.tsx` (3): renders summary/detail link; styles a negative balance as an expense; renders zero without expense styling.
- `src/components/Accounts/AccountInfo.test.tsx` (8): missing-account state; header/name/icon; credit details; available-credit calculation; progress percentage; no credit section for regular accounts; next-payment component for credit cards; no next-payment component for non-credit accounts.
- `src/components/Accounts/AccountNextPayment.test.tsx` (9): initial loading; fetch error; no-payment state; payment total/date; expanded movements/installments; switches between details and payment form; collapses and refreshes after payment success; stale account response; unmount safety.
- `src/components/Accounts/AccountsList.test.tsx` (5): empty list; all accounts; account names in cards; one account; updates one account without losing others.
- `src/components/Accounts/CreditCardPaymentForm.test.tsx` (11): basic fields; add/remove payment sources; live remaining amount and validity; recalculation and duplicate detection after edits; missing/duplicate source errors; atomic payment and callback; converted source amount; submission error; duplicate-submit lock and retry; cancel callback.
- `src/components/Accounts/Form.test.tsx` (12): fields/types; validation; create/edit; edit population; stale credit-field removal; duplicate-submit retry; default checked reset; unmount safety.
- `src/stores/accountsStore.test.ts` (29): populate/mutations/lookups/balance refresh; next-payment and atomic-payment contracts; mutation failure safety; regular and credit-account validation including credit limit, cutoff, payment-day, and non-finite/boundary values; account payload creation.

### Budgets

- `src/components/Budgets/BudgetCard.test.tsx` (4): name/period/amounts; warning and over-budget states with progress clamped to 100%; missing currency/category fallback; detail link.
- `src/components/Budgets/BudgetHelpers.test.tsx` (3): meter thresholds and over-budget output; zero-limit safety; deletion navigation only after success.
- `src/components/Budgets/BudgetInfo.test.tsx` (1): header with budget name and period.
- `src/components/Budgets/BudgetPeriods.test.tsx` (2): period rendering and reversed compact movement IDs; empty-period message.
- `src/components/Budgets/BudgetsList.test.tsx` (2): renders nothing with no budgets; one card per budget.
- `src/components/Budgets/Form.test.tsx` (7): create/edit/validation; default checked reset; update-type modal; duplicate-submit retry; unmount safety.
- `src/stores/budgetStore.test.ts` (6): populate period types/budgets; append create result; remove locally; update name locally; replace details after amount update; failed mutation safety.

### Movements

- `src/components/Movements/ActionButtons.test.tsx` (7): no movement renders nothing; correct edit modal for income, expense, and transfer; deletion for income, expense, and transfer.
- `src/components/Movements/MovementCard.test.tsx` (3): category/account; detail link; transfer destination account.
- `src/components/Movements/MovementForm.test.tsx` (23): planning context/failures; currency conversion; income/expense/transfer create/edit; installments; balance refresh; duplicate-submit retry; unmount safety.
- `src/components/Movements/MovementInfo.test.tsx` (8): missing movement; base rendering; expense properties; income properties; transfer properties/accounts; optional description and conversion details; installment section present; installment section absent.
- `src/components/Movements/MovementList.test.tsx` (5): empty IDs; Spanish date headings; cards grouped under dates; all-movement index; account-specific index.
- `src/components/Movements/MovementViews.test.tsx` (4): global IDs; landing order/link; compact financial semantics/navigation; missing relations.
- `src/components/Movements/SelectPlanning.test.tsx` (2): filters to active pending compatible plans; selection and clearing.
- `src/hooks/useMovementCurrencyConversion.test.ts` (4): conversion from cached rates; manual amount retained until ECB conversion; edit initialization/reset; transfer uses origin currency.
- `src/stores/movementsStore.test.ts` (21): populate data/types; ordering; transfer/source indexes; add/update/remove/refresh transitions; planning refresh; missing lookup; numeric-only indexes; grouping boundaries; failed mutation safety.

### Plannings

- `src/components/Plannings/PlanningActions.test.tsx` (2): confirmed deactivation; confirmed deletion.
- `src/components/Plannings/PlanningCard.test.tsx` (5): daily, weekly, monthly, and yearly recurrence formatting; simplified card summary.
- `src/components/Plannings/PlanningForm.test.tsx` (10): validation boundaries; base inputs; valid create; duplicate-submit retry; checked-default reset behavior; unmount safety.
- `src/components/Plannings/PlanningInfo.test.tsx` (3): core properties and relations; recurrence and actionable status; unresolved ID renders nothing.
- `src/components/Plannings/PlanningList.test.tsx` (4): list/filter pills; text search; active/inactive tabs; empty store.
- `src/components/Plannings/PlanningOccurrences.test.tsx` (3): load current/history; emit movement-create event; cancel current occurrence.
- `src/components/Plannings/PlanningRecurrenceForm.test.tsx` (8): recurrence buttons; switch type and clear stale fields; weekly-to-monthly clears weekdays; weekly toggle; monthly toggle; yearly add/remove; interval input; end-date toggle.
- `src/components/Plannings/UrgentOccurrences.test.tsx` (2): due-date distance formatting; overdue-first sorting with details/link.
- `src/stores/planningsStore.test.ts` (13): populate types/statuses/plans; lookup; load/cache occurrences; create/update/remove; cache purge; activate/deactivate; cancel/complete plus refresh; actionable/overdue calculation; failed mutation safety.

### Statistics

- `src/components/Statistics/StatisticsComponents.test.tsx` (6): overview/savings rate; trends/category percentages; cumulative balance chart; obligations/secondary metrics; earliest obligation urgency; zero-total safety and empty state.
- `src/components/Statistics/StatisticsForm.test.tsx` (2): current month with next disabled; period changes and allowed granularities.
- `src/stores/statisticsStore.test.ts` (8): currency required; fetch/cache/error/loading; currency isolation; out-of-order success/error protection; mutation invalidation of cache and in-flight responses.
- `src/lib/statisticsQuery.test.ts` (6): Monday week starts; month/year local midnight; leap/month/year shifting; half-open ranges; current/future navigation; default granularities.
- `src/hooks/useStatisticsSection.test.ts` (3): idle fetch; loading/cached suppression; currency symbol and missing fallback.

### Shared forms and display helpers

- `src/components/Forms/ConfirmModal.test.tsx` (7): confirmation contract; open; confirm and close; cancel and close; initial modal ID; prop-driven ID update; custom button class.
- `src/components/Forms/SelectAccounts.test.tsx` (5): active accounts only; excluded ID; exclude credit accounts; change callback; controlled selected value.
- `src/components/Forms/SelectCategories.test.tsx` (8): placeholder; selected name; dropdown toggle; root/child expansion; child selection and close; form submission value; subtree restriction; reset selection after incompatible root change.
- `src/components/Forms/SharedControls.test.tsx` (3): currency selection/forwarding; controlled segmented defaults; errors and disabled/busy actions.
- `src/components/General/AccountName.test.tsx` (2): resolved account; missing fallback.
- `src/components/General/AmountText.test.tsx` (4): neutral default; tone/icon; short/currency formatting; inline currency.
- `src/components/General/CategoryName.test.tsx` (4): resolved category; custom color; virtual category using parent icon/custom name; missing fallback.
- `src/lib/currencyConversion.test.ts` (3): EUR-reference conversion; same-currency identity; effective rate from persisted amounts.
- `src/hooks/useDate.test.ts` (2): stable localized dates and configured 12-hour output.
- `src/hooks/usePagination.test.ts` (3): clamped navigation; non-finite/fractional normalization; shrinking bounds.
- `src/lib/formatters.test.ts` (9): locale fallback; numeric/currency/compact boundaries; invalid values/currencies; Spanish hyphenation.
- `src/lib/init.test.ts` (4): initialization/population; fresh/stale rates; refresh fallback; failure propagation.
- `src/lib/menu.test.ts` (2): navbar toggling and missing-element safety.

### Other stores

- `src/stores/categoryStore.test.ts` (12): populate; lookup success/miss; empty tree; orphan promoted to root; synthetic General child for a parent; nested General child; no General for leaf; root-subtree filtering; subtree identity; direct/indirect descendants; unrelated category.
- `src/stores/currencyStore.test.ts` (5): populate; lookup success/miss; replace rates after refresh; retain cached rates on refresh failure.
- `src/stores/editStore.test.ts` (2): set edit state; clear edit state.

## Tauri command integration tests (60)

- `tests/integration/account-commands.spec.ts` (10): typed account list; add; update; balance query; remove count; credit-info schema; next credit payment; reject next-payment query for non-credit account; successful card payment updates balances and creates transfer; invalid card-payment parameters.
- `tests/integration/budget-commands.spec.ts` (10): typed period types; typed budget list; create; get existing; update name; update amount; delete count; affected budget for matching category; optional previous category; no affected budget.
- `tests/integration/category-commands.spec.ts` (2): typed category list; seeded values.
- `tests/integration/currency-commands.spec.ts` (3): typed currency list; seeded values; persisted refresh-rate shape.
- `tests/integration/movement-commands.spec.ts` (25): typed/seeded movement types; initially empty movements; create income, expense, installment expense, transfer, and description-less movement; reject invalid type, zero amount, transfer without destination, same-account transfer, and destination on non-transfer; retrieve inserted movements in descending timestamp order; get one movement; get installment list/shape/order; empty installments for ordinary movement; mark installments paid; update amount/description; reject type change; remove and confirm absence.
- `tests/integration/plannings-commands.spec.ts` (8): typed recurrence/status/planning/occurrence results; create/read daily, weekly, monthly, and yearly plans; invalid type/interval/range/recurrence-day matrix; update/deactivate/activate/cancel/delete lifecycle; linked movement completion and restoration on removal.
- `tests/integration/statistics-commands.spec.ts` (2): obligation response includes account and description data; options and all supported granularities.

## E2E tests (17)

- `tests/e2e/account-creation.spec.ts` (1): create a cash account.
- `tests/e2e/budget-creation.spec.ts` (1): create a monthly budget.
- `tests/e2e/movement-creation.spec.ts` (4): create/render/open income; expense; transfer; cross-currency transfer with distinct charged/received amounts.
- `tests/e2e/planning-flow.spec.ts` (1): create planning, link compatible movement, reload, cancel next occurrence.
- `tests/e2e/statistics-flow.spec.ts` (1): load dashboard and change period controls.
- `tests/e2e/financial-lifecycle.spec.ts` (9): account edit reload; credit-card creation/details; income create/update/delete with balance restoration; installment purchase persistence; atomic split card payment; child-category budget lifecycle; statistics mutation refresh; future budget scheduling; planning deactivate/reactivate.

## Test infrastructure and automation

- `tests/driver.ts`: selects a free WebDriver port, creates a fresh temporary SQLite database for every scenario, applies the canonical test seed plus optional scenario overlays, propagates startup failures, and performs verified idempotent teardown.
- `seeds/test.sql` and `src-tauri/seeds/test.sql`: deterministic frontend/integration and embedded Rust test fixtures; test overlays are accepted only in `Environment::Test`.
- `.github/workflows/tests.yml`: Windows and Ubuntu matrix with pinned tooling, caches, native dependencies, zero-diagnostic static analysis, ordered executable gates, and failure-only artifacts.
- Every E2E spec uses per-test setup and teardown without fixed sleeps or shared scenario state.

## Rust tests (141)

The names below are the Cargo test names with their common module prefix removed.

### Localized lookup queries (15)

`src-tauri/src/db/query_test.rs`:

- English and Spanish account types.
- English and Spanish budget period types.
- English and Spanish categories.
- English and Spanish currencies.
- English and Spanish movement types.
- Empty account types, budget period types, categories, currencies, and movement types when the language is absent.

### Statistics database queries (6)

`src-tauri/src/db/statistics_query.rs`:

- `balance_trend_is_cumulative_and_includes_opening_balance`
- `balance_trend_respects_currency_and_empty_periods`
- `categories_roll_up_children_without_double_counting`
- `currency_and_date_filters_are_isolated_and_half_open`
- `obligations_include_the_7_30_and_90_day_windows`
- `seeded_statistics_preserve_currency_and_transfer_semantics`

### Accounts (27)

`src-tauri/src/functions/accounts_test.rs`:

- Unit (13): account-type mapping; valid cash account; required name; long name; unknown account type; unknown currency; non-finite financial values; credit info required; positive credit limit; non-negative used balance; cutoff day range; days-to-pay range; valid credit card.
- Database/integration (14): return/add/update/remove accounts and credit info; account balances; next payment with no installments and across multiple movements; successful credit-card payment; invalid payment matrix; split-payment duplicate/retry contract; full transactional rollback.

### Budgets (19)

`src-tauri/src/functions/budgets_test.rs`:

- Unit (9): valid budget; required name; negative/non-finite amounts; zero amount and name/reference boundaries; exact category plus ancestors; root category; missing category; hierarchy cycle protection.
- Database/integration (10): creation and initial history; current/future-period changes; rename; delete with history cascade; recursive category spending; cross-currency conversion; invalid conversion-rate rejection; affected-budget IDs.

### Currency refresh parsing (2)

`src-tauri/src/functions/currencies.rs`:

- `parses_ecb_date_and_rates_with_euro_base`
- `rejects_invalid_ecb_rate`

### Movements (39)

`src-tauri/src/functions/movements_test.rs`:

- Unit validation (9): valid income; known type; transfer destination required; different transfer accounts; no destination for non-transfer; valid category/currency; positive amount; non-finite amounts and installment boundaries `0/1/48/49`.
- Balance and persistence (11): income/expense/transfer balances; cross-currency persistence and balance effects; update/delete reversal; same-type update; rejected type change; missing destination leaves source unchanged; removal reversal.
- Installments and retrieval (15): create/regenerate/delete behavior; no installments for ordinary expenses; exact-cent allocation from account amount; retrieval and ordering; single/multiple paid updates; nonexistent-row rollback; already-paid behavior.
- Transaction fault injection (3): late create, update, and delete failures roll back movement rows, balances, installments, planning state, and budget-visible data.
- Planning linkage (2): linked movement completes and advances an occurrence; deleting it restores the pending occurrence.

### Plannings (10)

`src-tauri/src/functions/plannings_test.rs`:

- Create daily/monthly initial occurrences; update recalculates pending occurrence; deactivate/reactivate; cancel and direct completion advance; multiple pending returns oldest; delete removes occurrences while preserving movements; reject credit-card income and non-finite amounts.

### Statistics command/domain (4)

`src-tauri/src/functions/statistics_test.rs`:

- Savings rate is null at zero income; invalid date range; invalid granularity; invalid currency.

### Date utilities (6)

`src-tauri/src/utils/date.rs`:

- Credit payment date before/after cutoff; cutoff clamping in leap and non-leap February; installment sequence across December/year rollover; local-midnight calendar round trip.

### Recurrence engine (13)

`src-tauri/src/utils/recurrence_test.rs`:

- Daily, weekly, monthly, and yearly schedules including multi-selection and interval cases; inclusive end-date behavior; invalid recurrence definitions; empty/out-of-range selections; duplicate/unsorted normalization; far-future fast-forward across leap and year boundaries.

## Remaining improvements

The completed P0/P1 rollout has been folded into the inventory above, so its historical gap list has been removed. The following work is still intentionally deferred and remains unchecked in [`planning/testing-implementation-checklist.md`](./planning/testing-implementation-checklist.md):

- **Accessibility and malformed state:** cover keyboard/focus behavior and lists/forms whose related resources disappear or contain invalid IDs while open.
- **Converted payment presentation:** display both source/original and card-account amounts for cross-currency card payments.
- **Platform coverage:** add macOS E2E after migrating to an embedded-driver approach such as WebdriverIO.
