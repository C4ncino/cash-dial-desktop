use serde::{Deserialize, Serialize};

/// Overview metrics: income, expenses, net cash flow, and savings rate
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub income: f64,
    pub expenses: f64,
    pub net_cash_flow: f64,
    pub savings_rate: Option<f64>, // null if income == 0
}

/// Single point in a time-series (aggregated by granularity)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimeSeriesPoint {
    pub bucket_start_ms: i64,
    pub income: f64,
    pub expense: f64,
    pub net: f64,
}

/// Cumulative balance at the start of a statistics bucket.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BalanceTrendPoint {
    pub bucket_start_ms: i64,
    pub balance: f64,
}

/// Category entry in the flat list (for UI sorting)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CategoryEntry {
    pub category_id: i32,
    pub name: String,
    pub parent_id: Option<i32>,
    pub amount: f64,
    pub percent_of_total: f64,
    pub is_virtual: bool,
}

/// Hierarchical category with children (for tree display)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HierarchicalCategory {
    pub category_id: i32,
    pub name: String,
    pub parent_id: Option<i32>,
    pub amount: f64,
    pub percent_of_total: f64,
    pub is_virtual: bool,
    pub children: Vec<HierarchicalCategory>,
}

/// Category aggregation response
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Categories {
    pub total_expenses: f64,
    pub by_category_hierarchy: Vec<HierarchicalCategory>,
    pub by_category_flat: Vec<CategoryEntry>,
}

/// Single installment obligation
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Obligation {
    pub installment_id: i32,
    pub movement_id: i32,
    pub account_id: i32,
    pub due_timestamp: i64,
    pub amount: f64,
    pub paid: bool,
    pub description: Option<String>,
    pub category_id: i32,
}

/// Obligation totals for different time windows
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ObligationTotals {
    pub next_7_days: f64,
    pub next_30_days: f64,
    pub next_90_days: f64,
}

/// Obligations response (totals + detailed items)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Obligations {
    pub totals: ObligationTotals,
    pub items: Vec<Obligation>,
}

/// Highest spending day record
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HighestSpendingDay {
    pub bucket_start_ms: i64,
    pub amount: f64,
}

/// Largest expense movement
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LargestExpense {
    pub movement_id: i32,
    pub amount: f64,
    pub timestamp: i64,
}

/// Secondary statistics (counts, averages, extremes)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecondaryMetrics {
    pub movement_count: i32,      // includes transfers
    pub transaction_count: i32,   // income + expenses only
    pub avg_expense: Option<f64>, // null if no expenses
    pub avg_daily_spending: f64,  // includes zero-days
    pub highest_spending_day: Option<HighestSpendingDay>,
    pub largest_expense: Option<LargestExpense>,
}

/// The complete statistics response
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StatisticsResponse {
    pub currency_id: i32,
    pub start_ms: i64,
    pub end_ms: i64,
    pub overview: Overview,
    pub timeseries: Vec<TimeSeriesPoint>,
    pub balance_trend: Vec<BalanceTrendPoint>,
    pub categories: Categories,
    pub obligations: Obligations,
    pub secondary: SecondaryMetrics,
}

/// Options for statistics queries (e.g., drill-down by category)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StatisticsOptions {
    pub category_id: Option<i32>,
    pub include_descendants: Option<bool>,
    pub include_obligations: Option<bool>,
    pub origin_timezone_override: Option<String>,
}
