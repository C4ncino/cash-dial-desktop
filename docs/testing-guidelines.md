## Testing guidelines

Use these as the general rules for the test suite going forward:

1. **Test behavior and invariants, not implementation details.** Prefer tests such as “reset restores the original form state” over “reset button renders.” Avoid testing React keys, trivial prop forwarding, CSS-only truncation, or text that is already covered by a broader rendering test.

2. **Give each test layer a clear responsibility.**

   * **Frontend unit/component:** UI state, conditional rendering, form behavior, validation feedback, interactions, and store integration.
   * **Frontend stores:** indexing, caching, state transitions, derived state, and Tauri command interaction.
   * **Rust:** exhaustive business rules, validation, financial calculations, database invariants, transactions, rollback, recurrence, balances, installments, and category hierarchy.
   * **Tauri integration:** command contracts, serialization, database persistence, and a representative set of validation failures.
   * **E2E:** only critical user journeys that cross the complete application stack.

3. **Do not repeat every backend validation rule at every layer.** Rust should own exhaustive validation. Integration tests should verify representative failures cross the Tauri boundary. E2E should not duplicate backend validation matrices.

4. **Prioritize financial invariants.** Add explicit coverage whenever behavior can affect balances, payments, installments, budgets, currencies, or statistics. Transaction rollback tests should verify that all related records remain unchanged after failure.

5. **Test boundaries, not just normal values.** For validated ranges, test the minimum valid value, maximum valid value, and one invalid value outside each boundary when relevant.

6. **Test state transitions.** Forms should test things such as credit → non-credit, selected → reset, create → success, edit → reset, loading → success, loading → error, and stale data → refreshed data.

7. **Test derived indexes and caches as invariants.** For Zustand stores, explicitly verify removal from old indexes, insertion into new indexes, transfer membership in both accounts, cache-key isolation, and cache invalidation.

8. **Use parameterized tests for equivalent variants.** Income/expense/transfer or similar cases should share one parameterized test when the expected behavior is structurally identical.

9. **Avoid multiple tests that prove the same rendering contract.** A component normally needs one basic rendering smoke test plus tests for meaningful branches and interactions. Separate assertions like “renders title,” “renders button,” and “renders description” should be consolidated when they do not represent independent behavior.

10. **Every substantial new feature needs backend coverage first.** A feature such as Statistics should not be considered adequately tested because its React components render correctly. Business calculations should have Rust tests, followed by a small command-integration suite and only essential E2E coverage.

11. **Keep E2E small and high-value.** Prefer flows such as “create credit expense → see next payment → pay card → balances update” over dozens of validation permutations.

12. **When fixing a regression, add the test at the lowest layer that can reliably reproduce it.** Add higher-layer coverage only when the failure specifically concerns integration or user-visible behavior.

The practical objective should be to **reduce low-value frontend assertions while increasing domain-level coverage**, rather than trying to maximize or minimize the raw test count.

## Quality-pass rules

When changing the suite, use this order:

1. Remove or consolidate assertions that only prove React keys, CSS classes, trivial prop forwarding, or isolated static labels.
2. Replace removed cases with a behavior assertion when the implementation detail represented a real product invariant, such as list reconciliation or form reset.
3. Add financial correctness at the Rust layer first, especially when a value affects balances, conversions, installments, budgets, or statistics.
4. Add only representative command-boundary cases in integration tests; do not duplicate the complete Rust validation matrix.
5. Keep E2E focused on complete business workflows and do not use it to test chart internals or every validation branch.
6. Every regression fix must assert the observable failure mode at the lowest reliable layer.

For mutations, prefer assertions of the complete effect: persisted record, affected balances, related rows, unchanged unrelated records, and rollback after failure. For caches and indexes, verify both the positive entry and removal/replacement of stale entries. Test names should describe the condition and observable result, for example `uses account_amount for the destination balance in a cross-currency transfer`.
