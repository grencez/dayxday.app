<template>
  <section class="today-receipt" aria-labelledby="today-receipt-heading">
    <header class="receipt-heading">
      <h2 id="today-receipt-heading">Today</h2>
      <strong class="coverage-percent">
        {{ Math.round(receipt.coveragePercent) }}% tracked
      </strong>
    </header>

    <div class="coverage-summary">
      <progress
        :value="receipt.trackedMinutes"
        :max="Math.max(receipt.elapsedMinutes, 1)"
        :aria-label="`${Math.round(receipt.coveragePercent)}% of today tracked`"
      ></progress>
      <span
        ><strong>{{ formatReceiptDuration(receipt.trackedMinutes) }}</strong>
        tracked</span
      >
      <span
        >{{ formatReceiptDuration(receipt.untrackedMinutes) }} untracked</span
      >
    </div>

    <div class="receipt-breakdown">
      <section aria-labelledby="activity-totals-heading">
        <h3 id="activity-totals-heading">Totals</h3>
        <p v-if="receipt.totals.length === 0" class="receipt-empty">
          No tracked time yet.
        </p>
        <ul v-else class="activity-totals">
          <li v-for="total in receipt.totals" :key="total.name">
            <span>{{ total.name }}</span>
            <strong>{{ formatReceiptDuration(total.minutes) }}</strong>
          </li>
        </ul>
      </section>

      <section aria-labelledby="today-segments-heading">
        <h3 id="today-segments-heading">Segments</h3>
        <p v-if="receipt.segments.length === 0" class="receipt-empty">
          Completed and current activities will appear here.
        </p>
        <ol v-else class="receipt-segments">
          <li v-for="segment in receipt.segments" :key="segment.key">
            <div class="segment-main">
              <strong>{{ segment.name }}</strong>
              <span class="segment-duration">
                {{ formatReceiptDuration(segment.durationMinutes) }}
              </span>
            </div>
            <div class="segment-time">
              {{ formatReceiptClock(segment.startMs) }}–<template
                v-if="segment.ongoing"
                >Now</template
              ><template v-else>{{
                formatReceiptClock(segment.endMs)
              }}</template>
              <span v-if="segment.ongoing" class="ongoing-label">Current</span>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  formatReceiptClock,
  formatReceiptDuration,
  type TodayReceipt,
} from "../function/buildTodayReceipt";

defineProps<{
  receipt: TodayReceipt;
}>();
</script>

<style scoped>
.today-receipt {
  grid-column: 1 / 3;
  min-width: 0;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.receipt-heading,
.coverage-summary,
.segment-main,
.segment-time,
.activity-totals li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.receipt-heading h2,
.receipt-breakdown h3 {
  margin-top: 0;
}

.receipt-heading h2 {
  margin-bottom: 8px;
}

.coverage-percent,
.segment-duration,
.segment-time,
.activity-totals strong {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.coverage-summary {
  flex-wrap: wrap;
  color: var(--color-muted);
}

.coverage-summary progress {
  flex: 1 0 100%;
  width: 100%;
  height: 10px;
}

.receipt-breakdown {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 24px;
  margin-top: 18px;
}

.receipt-breakdown h3 {
  margin-bottom: 8px;
  font-size: 1em;
}

.activity-totals,
.receipt-segments {
  padding: 0;
  margin: 0;
  list-style: none;
}

.activity-totals li,
.receipt-segments li {
  padding: 8px 0;
  border-top: 1px solid var(--color-border-subtle);
}

.activity-totals span,
.segment-main strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.segment-time {
  justify-content: flex-start;
  margin-top: 3px;
  font-size: 0.85em;
  color: var(--color-muted);
}

.ongoing-label {
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--color-current);
  background: var(--color-current-background);
}

.receipt-empty {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.4;
}

@media (max-width: 560px) {
  .receipt-breakdown {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>
