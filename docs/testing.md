# Test suite map and remaining improvements

Last inventoried: 2026-09-04

This document maps every executable test currently collected by Vitest and Cargo. Parameterized tests are counted after expansion. The coverage assessment follows [`testing-guidelines.md`](./testing-guidelines.md): financial and database invariants belong primarily in Rust, command contracts in integration tests, UI behavior in component/store tests, and only critical full-stack journeys in E2E.

## Suite summary

| Layer                         | Command                                          |   Cases | Main responsibility                                                       |
| ----------------------------- | ------------------------------------------------ | ------: | ------------------------------------------------------------------------- |
| Frontend unit/component/store | `pnpm test`                                      |     389 | UI behavior, form state, store indexes/caches, frontend helpers           |
| Tauri command integration     | `pnpm test:integration`                          |      60 | Command serialization, persistence, representative failures               |
| E2E                           | `pnpm test:e2e`                                  |      19 | Critical full-stack user journeys                                         |
| Rust unit/database            | `cd src-tauri && cargo test -- --test-threads=1` |     162 | Validation, calculations, transactions, balances, recurrence, persistence |
| **Total**                     |                                                  | **630** |                                                                           |

`vitest list` and `cargo test -- --list` were used for the inventory. A listed test is not necessarily a passing test; use the commands above for the current result.

## Verification status

Last full local verification on 2026-09-04:

- Frontend: 60 files and 389 tests passed.
- Rust: 162 tests passed.
- Tauri integration: 7 files and 60 tests passed.
- E2E: 6 files and 19 independent tests passed without fixed sleeps or shared scenario databases.
- The Tauri debug test build passed as part of the integration and E2E commands.
- Static analysis: `pnpm check` passed with 0 errors, 0 warnings, and 0 hints.
- Biome lint completed successfully with 208 non-blocking warnings; the release helper's 9 tests passed.

## Frontend unit, component, hook, and store tests (389)

Each entry below maps all cases collected from that file. Numbers in parentheses are executable case counts.

### Accounts

- `src/components/Accounts/ActionButtons.test.tsx` (4): activates and deactivates accounts with the matching command/modal/toast; calls store removal after delete confirmation; navigates back after deletion.
- `src/components/Accounts/AccountCard.test.tsx` (5): renders summary/detail links and account status; styles regular negative/zero balances correctly; displays credit-card debt instead of available credit.
- `src/components/Accounts/AccountInfo.test.tsx` (9): missing-account state; header/name/icon; active/inactive status; credit details with debt and available-credit calculations; progress percentage; regular-account and next-payment branches.
- `src/components/Accounts/AccountNextPayment.test.tsx` (9): initial loading; fetch error; no-payment state; payment total/date; expanded movements/installments; switches between details and payment form; collapses and refreshes after payment success; stale account response; unmount safety.
- `src/components/Accounts/AccountsList.test.tsx` (9): distinct empty and no-match states; rendering and reactive updates; type/status filters; case-insensitive trimmed search with filter-reset rules; eight-item pagination and page reset behavior.
- `src/components/Accounts/CreditCardPaymentForm.test.tsx` (11): basic fields; add/remove payment sources; live remaining amount and validity; recalculation and duplicate detection after edits; missing/duplicate source errors; atomic payment and callback; converted source amount; submission error; duplicate-submit lock and retry; cancel callback.
- `src/components/Accounts/Form.test.tsx` (14): fields/types; validation; create/edit; credit debt-to-available conversion; edit population; stale credit-field removal and stale edit-state isolation; duplicate-submit retry; default checked reset; unmount safety.
- `src/stores/accountsStore.test.ts` (36): populate/mutations/lookups/balance refresh; activation/deactivation replacement and failure safety; next-payment and atomic-payment contracts; mutation failure safety; regular and credit-account validation including debt/credit-limit conversion, cutoff, payment-day, and non-finite/boundary values; account payload creation.

### Budgets

- `src/components/Budgets/BudgetCard.test.tsx` (4): name/period/amounts; warning and over-budget states with progress clamped to 100%; missing currency/category fallback; detail link.
- `src/components/Budgets/BudgetHelpers.test.tsx` (3): meter thresholds and over-budget output; zero-limit safety; deletion navigation only after success.
- `src/components/Budgets/BudgetInfo.test.tsx` (1): header with budget name and period.
- `src/components/Budgets/BudgetPeriods.test.tsx` (2): period rendering and reversed compact movement IDs; empty-period message.
- `src/components/Budgets/BudgetsList.test.tsx` (2): renders nothing with no budgets; one card per budget.
- `src/components/Budgets/Form.test.tsx` (8): create/edit/validation; responsive joined amount/currency structure; default checked reset; update-type modal; duplicate-submit retry; unmount safety.
- `src/stores/budgetStore.test.ts` (6): populate period types/budgets; append create result; remove locally; update name locally; replace details after amount update; failed mutation safety.

### Movements

- `src/components/Movements/ActionButtons.test.tsx` (7): no movement renders nothing; correct edit modal for income, expense, and transfer; deletion for income, expense, and transfer.
- `src/components/Movements/CreateMovementMenu.test.tsx` (6): labeled action expansion and request dispatch; movement-type outline/text colors and transfer-icon rotation; Escape focus restoration; inactive-account disabling; credit-card transfer disabling with valid prefill; transfer disabling without another active account.
- `src/components/Movements/MovementCard.test.tsx` (3): category/account; detail link; transfer destination account.
- `src/components/Movements/MovementForm.test.tsx` (27): planning context/failures; contextual account prefill and clearing; create requests ignored by unrelated/edit forms; stale edit-state isolation; currency conversion; income/expense/transfer create/edit; installments; balance refresh; duplicate-submit retry; unmount safety.
- `src/components/Movements/MovementInfo.test.tsx` (9): missing movement; base rendering; expense properties; income properties; transfer properties/accounts; optional description; source/destination-aware conversion details; installment section present/absent.
- `src/components/Movements/MovementList.test.tsx` (5): empty IDs; Spanish date headings; cards grouped under dates; all-movement index; account-specific index.
- `src/components/Movements/MovementViews.test.tsx` (2): global IDs and landing order/link; compact financial semantics/navigation and missing relations.
- `src/components/Movements/SelectPlanning.test.tsx` (2): filters to active pending compatible plans; selection and clearing.
- `src/hooks/useMovementCurrencyConversion.test.ts` (4): conversion from cached rates; manual amount retained until ECB conversion; edit initialization/reset; transfer uses origin currency.
- `src/stores/movementsStore.test.ts` (24): populate data/types; descending timestamp/ID ordering after add, update, and refresh; transfer/source indexes; add/update/remove/refresh transitions; planning refresh; missing lookup; numeric-only indexes; grouping boundaries; failed mutation safety.

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

- `src/components/Statistics/StatisticsComponents.test.tsx` (7): overview/savings rate; trends/category percentages; cumulative balance chart; obligations/secondary metrics; earliest obligation urgency; rounded negative-zero normalization; zero-total safety and empty state.
- `src/components/Statistics/StatisticsForm.test.tsx` (3): current month with next disabled; period changes and allowed granularities; direct week/month/year picker values and limits.
- `src/stores/statisticsStore.test.ts` (10): currency required; fetch/cache/error/loading; currency isolation; out-of-order success/error protection; mutation invalidation; normalized direct period selection and future-period clamping.
- `src/lib/statisticsQuery.test.ts` (9): Monday/ISO week handling; month/year local midnight; picker formatting/parsing and malformed values; leap/month/year shifting; half-open ranges; current/future navigation; default granularities.
- `src/hooks/useStatisticsSection.test.ts` (3): idle fetch; loading/cached suppression; currency symbol and missing fallback.

### Shared forms and display helpers

- `src/components/Forms/ConfirmModal.test.tsx` (8): confirmation contract; open; confirm and close; cancel and close; initial modal ID; prop-driven ID update; custom button class; shared semantic styles for the opener and footer actions.
- `src/components/Forms/SelectAccounts.test.tsx` (5): active accounts only; excluded ID; exclude credit accounts; change callback; controlled selected value.
- `src/components/Forms/SelectCategories.test.tsx` (9): placeholder; selected name and transfer-icon rotation; dropdown toggle; root/child expansion; child selection and close; form submission value; subtree restriction; reset selection after incompatible root change.
- `src/components/Forms/SharedControls.test.tsx` (3): currency selection/forwarding; controlled segmented defaults; errors and disabled/busy actions.
- `src/components/General/AccountName.test.tsx` (2): resolved account; missing fallback.
- `src/components/General/ActionButton.test.tsx` (9): all semantic tones; common sizing and shape; native defaults and attribute forwarding; contextual full width; caller class merging.
- `src/components/General/AddButton.test.tsx` (1): shared primary treatment, label, icon, modal target, and attribute forwarding.
- `src/components/General/AmountText.test.tsx` (4): neutral default; tone/icon; short/currency formatting; inline currency.
- `src/components/General/CategoryName.test.tsx` (5): resolved category; custom color; virtual category using parent icon/custom name; missing fallback; transfer-icon rotation.
- `src/components/General/EntityIcon.test.tsx` (3): transfer-icon rotation with prefixed and unprefixed Iconoir names; ordinary icons remain unrotated.
- `src/lib/currencyConversion.test.ts` (3): EUR-reference conversion; same-currency identity; effective rate from persisted amounts.
- `src/lib/accountBalance.test.ts` (1): regular balances remain unchanged while credit-card available balances are converted to debt.
- `src/hooks/useDate.test.ts` (2): stable localized dates and configured 12-hour output.
- `src/hooks/usePagination.test.ts` (3): clamped navigation; non-finite/fractional normalization; shrinking bounds.
- `src/hooks/useTheme.test.ts` (2): reads the current theme and reacts to theme-change events.
- `src/lib/formatters.test.ts` (10): locale fallback; numeric/currency/compact boundaries; invalid values/currencies; rounded negative-zero normalization; Spanish hyphenation.
- `src/lib/init.test.ts` (4): initialization/population; fresh/stale rates; refresh fallback; failure propagation.
- `src/lib/menu.test.ts` (2): navbar toggling and missing-element safety.

### Other stores

- `src/stores/categoryStore.test.ts` (12): populate; lookup success/miss; empty tree; orphan promoted to root; synthetic General child for a parent; nested General child; no General for leaf; root-subtree filtering; subtree identity; direct/indirect descendants; unrelated category.
- `src/stores/currencyStore.test.ts` (5): populate; lookup success/miss; replace rates after refresh; retain cached rates on refresh failure.
- `src/stores/editStore.test.ts` (2): set edit state; clear edit state.

## Tauri command integration tests (60)

- `tests/integration/account-commands.spec.ts` (11): typed account list; add; update; deactivate/reactivate persistence; balance query; remove count; credit-info schema; next credit payment; reject next-payment query for non-credit account; successful card payment updates balances and creates transfer; invalid card-payment parameters.
- `tests/integration/budget-commands.spec.ts` (10): typed period types; typed budget list; create; get existing; update name; update amount; delete count; affected budget for matching category; optional previous category; no affected budget.
- `tests/integration/category-commands.spec.ts` (2): typed category list; seeded values.
- `tests/integration/currency-commands.spec.ts` (3): typed currency list; seeded values; persisted refresh-rate shape.
- `tests/integration/movement-commands.spec.ts` (24): typed/seeded movement types; initially empty movements; create income, expense, installment expense, transfer, and description-less movement; reject invalid type, zero amount, transfer without destination, same-account transfer, and destination on non-transfer; retrieve inserted movements in descending timestamp order; get one movement; get installment list/shape/order; empty installments for ordinary movement; mark installments paid; update amount/description; reject type change; remove and confirm absence.
- `tests/integration/plannings-commands.spec.ts` (8): typed recurrence/status/planning/occurrence results; create/read daily, weekly, monthly, and yearly plans; invalid type/interval/range/recurrence-day matrix; update/deactivate/activate/cancel/delete lifecycle; linked movement completion and restoration on removal.
- `tests/integration/statistics-commands.spec.ts` (2): obligation response includes account and description data; options and all supported granularities; seeded balance trends exclude credit-card balances.

## E2E tests (19)

- `tests/e2e/account-creation.spec.ts` (2): create a cash account; create a new account after navigating away from a stale edit form.
- `tests/e2e/budget-creation.spec.ts` (1): create a monthly budget and verify the joined amount/currency control at mobile and desktop widths in light and dark themes.
- `tests/e2e/movement-creation.spec.ts` (5): Home speed-dial availability; labeled movement menus on Movements and Account details with account prefill; create/render/open income, expense, transfer, and cross-currency transfer with distinct charged/received amounts.
- `tests/e2e/planning-flow.spec.ts` (1): create planning, link compatible movement, reload, cancel next occurrence.
- `tests/e2e/statistics-flow.spec.ts` (1): load the dashboard, switch period type, jump directly to a historical year, navigate with arrows, and reject invalid numeric output including negative zero.
- `tests/e2e/financial-lifecycle.spec.ts` (9): account edit reload; credit-card creation from debt input with persisted available balance and debt presentation; income create/update/delete with balance restoration; installment purchase persistence; atomic split card payment; child-category budget lifecycle; statistics mutation refresh; future budget scheduling; planning deactivate/reactivate.

## Test infrastructure and automation

- `tests/driver.ts`: selects a free WebDriver port, creates a fresh temporary SQLite database for every scenario, applies the canonical test seed plus optional scenario overlays, propagates startup failures, and performs verified idempotent teardown.
- `seeds/test.sql` and `src-tauri/seeds/test.sql`: deterministic frontend/integration and embedded Rust test fixtures; test overlays are accepted only in `Environment::Test`.
- `.github/workflows/tests.yml`: Windows and Ubuntu matrix with pinned tooling, caches, native dependencies, zero-diagnostic static analysis, ordered executable gates, and failure-only artifacts.
- Every E2E spec uses per-test setup and teardown without fixed sleeps or shared scenario state.

## Rust tests (162)

The names below are the Cargo test names with their common module prefix removed.

### Localized lookup queries (15)

`src-tauri/src/db/query_test.rs`:

- English and Spanish account types.
- English and Spanish budget period types.
- English and Spanish categories.
- English and Spanish currencies.
- English and Spanish movement types.
- Empty account types, budget period types, categories, currencies, and movement types when the language is absent.

### Statistics database queries (7)

`src-tauri/src/db/statistics_query.rs`:

- `balance_trend_is_cumulative_and_includes_opening_balance`
- `balance_trend_excludes_credit_accounts_and_keeps_eligible_transfer_sides`
- `balance_trend_respects_currency_and_empty_periods`
- `categories_roll_up_children_without_double_counting`
- `currency_and_date_filters_are_isolated_and_half_open`
- `obligations_include_the_7_30_and_90_day_windows`
- `seeded_statistics_preserve_currency_and_transfer_semantics`

The balance-trend cases cover opening balances, inactive accounts, historical/current/future movements, empty periods, same-currency transfers, and both sides of cross-currency transfers.

### Database bootstrap (2)

`src-tauri/src/db.rs`:

- Fresh development databases load embedded reference/demo data independently of the working directory.
- Fresh production databases load reference data without demo accounts.

### Domain invariants (13)

- Accounts (2): explicit credit-card state and grouping only the earliest payment cycle.
- Budgets (1): conversion selects the amount whose currency semantics match the budget.
- Categories (2): ancestor/descendant traversal and missing-node/cycle reporting.
- Installments (2): invalid counts fail before calculation; cent-preserving splits advance due dates correctly.
- Money (2): balance deltas reverse exactly; semantic amounts reject non-finite and non-positive values.
- Movements (2): applying/reversing preserves effects; invalid movement shapes cannot be constructed.
- Statistics (2): zero-total calculations and ordered accumulation; obligation windows without persistence.

### Accounts (29)

`src-tauri/src/functions/accounts_test.rs`:

- Unit (13): account-type mapping; valid cash account; required name; long name; unknown account type; unknown currency; non-finite financial values; credit info required; positive credit limit; non-negative used balance; cutoff day range; days-to-pay range; valid credit card.
- Database/integration (16): return/add/update/remove accounts and credit info; activation/deactivation persistence and missing-ID behavior; account balances; next payment with no installments and across multiple movements; successful credit-card payment; inactive target/source rejection; invalid payment matrix; split-payment duplicate/retry contract; full transactional rollback.

### Budgets (19)

`src-tauri/src/functions/budgets_test.rs`:

- Unit (9): valid budget; required name; negative/non-finite amounts; zero amount and name/reference boundaries; exact category plus ancestors; root category; missing category; hierarchy cycle protection.
- Database/integration (10): creation and initial history; current/future-period changes; rename; delete with history cascade; recursive category spending; cross-currency conversion; invalid conversion-rate rejection; affected-budget IDs.

### Currency refresh parsing (2)

`src-tauri/src/functions/currencies.rs`:

- `parses_ecb_date_and_rates_with_euro_base`
- `rejects_invalid_ecb_rate`

### Movements (41)

`src-tauri/src/functions/movements_test.rs`:

- Unit validation (9): valid income; known type; transfer destination required; different transfer accounts; no destination for non-transfer; valid category/currency; positive amount; non-finite amounts and installment boundaries `0/1/48/49`.
- Balance and persistence: income/expense/transfer balances; cross-currency persistence and balance effects; inactive source/destination rejection for new movements; stable descending ID ordering for equal timestamps; update/delete reversal; same-type update; rejected type change; missing destination leaves source unchanged; removal reversal.
- Installments and retrieval (15): create/regenerate/delete behavior; no installments for ordinary expenses; exact-cent allocation from account amount; retrieval and ordering; single/multiple paid updates; nonexistent-row rollback; already-paid behavior.
- Transaction fault injection (3): late create, update, and delete failures roll back movement rows, balances, installments, planning state, and budget-visible data.
- Planning linkage (2): linked movement completes and advances an occurrence; deleting it restores the pending occurrence.

### Plannings (11)

`src-tauri/src/functions/plannings_test.rs`:

- Create daily/monthly initial occurrences; create/update reject inactive accounts; update recalculates pending occurrence; deactivate/reactivate; cancel and direct completion advance; multiple pending returns oldest; delete removes occurrences while preserving movements; reject credit-card income and non-finite amounts.

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
