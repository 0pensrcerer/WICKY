/**
 * SignalAggregator — evaluates 6 market indicators and emits a composite
 * buy / sell / neutral signal on every data update.
 *
 * Indicators
 *   1. Price Action  – price near/above candle open = BUY, below = SELL
 *   2. Dark Pool     – DP print below current price = BUY, above = SELL
 *   3. NOF           – NOFA trending up from previous candle = BUY, down = SELL
 *   4. MomoFlow      – positive value = BUY, negative = SELL
 *   5. MM Skew       – positive value = BUY, negative = SELL (uses "MM Skew" field,
 *                       falls back to "SmartFlow")
 *   6. GEX           – GEX or Call HP increases from previous candle = BUY,
 *                       both decrease = SELL (uses "GEX" field, falls back to
 *                       "Gamma Gravity All"; also checks "Call Wall All" delta)
 *
 * Individual signals: +1 = BUY, 0 = NEUTRAL, -1 = SELL
 * Total ranges from -6 (max sell) to +6 (max buy).
 */

class SignalAggregator {
    constructor() {
        // Price action threshold: how far below the candle open before SELL
        this.PRICE_THRESHOLD = 0.05; // $0.05

        this.currentMetrics = {};
        this.previousCandleMetrics = {};
        this.currentPrice = null;
        this.candleOpenPrice = null;
        this._currentMinuteKey = null;
        this._listeners = [];
        this._lastDirection = null;

        console.log('[SignalAggregator] Initialized (price threshold: $' + this.PRICE_THRESHOLD + ')');
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /** Register a callback invoked on every signal update. */
    onUpdate(callback) {
        this._listeners.push(callback);
    }

    /**
     * Feed a new live price. Detects minute boundaries (new candle) and
     * snapshots previousCandleMetrics / candleOpenPrice accordingly.
     */
    updatePrice(price) {
        if (price == null || isNaN(price)) return;

        const now = new Date();
        const minuteKey = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

        if (this._currentMinuteKey !== minuteKey) {
            // New candle — save current state as previous before resetting
            this.previousCandleMetrics = Object.assign({}, this.currentMetrics);
            const prev = this._currentMinuteKey || 'none';
            this.candleOpenPrice = price;
            this._currentMinuteKey = minuteKey;
            console.log('[SignalAggregator] New candle ' + minuteKey +
                ' (prev: ' + prev + ') | open: ' + price +
                ' | previous metrics saved');
        }

        this.currentPrice = price;
        this._emit();
    }

    /**
     * Feed the latest full metrics object (from chrome.storage extractedData).
     */
    updateMetrics(data) {
        if (!data || typeof data !== 'object') return;
        this.currentMetrics = data;
        this._emit();
    }

    /** Compute and return the current aggregate result without emitting. */
    aggregate() {
        const signals = {
            priceAction: this._priceActionSignal(),
            darkPool:    this._darkPoolSignal(),
            nof:         this._nofSignal(),
            momoFlow:    this._momoFlowSignal(),
            mmSkew:      this._mmSkewSignal(),
            gex:         this._gexSignal()
        };

        const values = Object.values(signals);
        const buyCount  = values.filter(v => v ===  1).length;
        const sellCount = values.filter(v => v === -1).length;
        const total     = buyCount - sellCount;

        let direction, agreementCount;
        if (total > 0)      { direction = 'BUY';     agreementCount = buyCount; }
        else if (total < 0) { direction = 'SELL';    agreementCount = sellCount; }
        else                { direction = 'NEUTRAL';  agreementCount = 0; }

        return { signals, buyCount, sellCount, total, direction, agreementCount,
                 timestamp: new Date().toISOString() };
    }

    // ── Individual signal evaluators ────────────────────────────────────────

    /**
     * Price Action: price >= (candle open - threshold) = BUY, else SELL.
     * Returns 0 when no price or candle open is available yet.
     */
    _priceActionSignal() {
        if (this.currentPrice == null || this.candleOpenPrice == null) return 0;
        const diff = this.currentPrice - this.candleOpenPrice;
        const signal = diff >= -this.PRICE_THRESHOLD ? 1 : -1;
        console.log('[SignalAggregator][PA] price=' + this.currentPrice +
            ' open=' + this.candleOpenPrice +
            ' diff=' + diff.toFixed(3) + ' → ' + signal);
        return signal;
    }

    /**
     * Dark Pool: DP print below current price = BUY, above = SELL.
     * Falls back to 0 if "Dark Pool" metric is not available.
     */
    _darkPoolSignal() {
        const dp = this._parse(this.currentMetrics['Dark Pool']);
        if (dp == null || this.currentPrice == null) return 0;
        const signal = dp < this.currentPrice ? 1 : dp > this.currentPrice ? -1 : 0;
        console.log('[SignalAggregator][DP] dp=' + dp +
            ' price=' + this.currentPrice + ' → ' + signal);
        return signal;
    }

    /**
     * NOF: NOFA trending up from previous candle = BUY, down = SELL.
     * Returns 0 when previous candle data is not yet available.
     */
    _nofSignal() {
        const curr = this._parse(this.currentMetrics['NOFA']);
        const prev = this._parse(this.previousCandleMetrics['NOFA']);
        if (curr == null || prev == null) return 0;
        const signal = curr > prev ? 1 : curr < prev ? -1 : 0;
        console.log('[SignalAggregator][NOF] curr=' + curr +
            ' prev=' + prev + ' Δ=' + (curr - prev) + ' → ' + signal);
        return signal;
    }

    /**
     * MomoFlow: positive value = BUY, negative = SELL.
     */
    _momoFlowSignal() {
        const value = this._parse(this.currentMetrics['MomoFlow']);
        if (value == null) return 0;
        const signal = value > 0 ? 1 : value < 0 ? -1 : 0;
        console.log('[SignalAggregator][MOMO] value=' + value + ' → ' + signal);
        return signal;
    }

    /**
     * MM Skew: positive = BUY, negative = SELL.
     * Prefers "MM Skew" field; falls back to "SmartFlow".
     */
    _mmSkewSignal() {
        const raw = ('MM Skew' in this.currentMetrics)
            ? this.currentMetrics['MM Skew']
            : this.currentMetrics['SmartFlow'];
        const value = this._parse(raw);
        if (value == null) return 0;
        const signal = value > 0 ? 1 : value < 0 ? -1 : 0;
        console.log('[SignalAggregator][SKEW] value=' + value + ' → ' + signal);
        return signal;
    }

    /**
     * GEX: GEX or Call HP increases from previous candle = BUY.
     * Both decrease = SELL. Mixed / unavailable = NEUTRAL.
     *
     * GEX field: prefers "GEX", falls back to "Gamma Gravity All".
     * Call HP field: "Call Wall All".
     */
    _gexSignal() {
        const gexKey    = 'GEX' in this.currentMetrics ? 'GEX' : 'Gamma Gravity All';
        const gexDelta  = this._delta(gexKey);
        const callDelta = this._delta('Call Wall All');

        if (gexDelta == null && callDelta == null) return 0;

        let signal;
        if (gexDelta != null && callDelta != null) {
            // Both available: BUY if either up, SELL if both down, else NEUTRAL
            if (gexDelta > 0 || callDelta > 0) signal = 1;
            else if (gexDelta < 0 && callDelta < 0) signal = -1;
            else signal = 0;
        } else {
            // Only one available
            const delta = gexDelta != null ? gexDelta : callDelta;
            signal = delta > 0 ? 1 : delta < 0 ? -1 : 0;
        }

        console.log('[SignalAggregator][GEX] ' + gexKey + ' Δ=' + gexDelta +
            ' CallHP Δ=' + callDelta + ' → ' + signal);
        return signal;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Parse a formatted numeric string ("1,234,567" or "-50,000") to a float. */
    _parse(str) {
        if (str == null || str === '') return null;
        const n = parseFloat(String(str).replace(/[$,\s]/g, ''));
        return isNaN(n) ? null : n;
    }

    /** Delta between current and previous candle for a given metric key. */
    _delta(key) {
        const curr = this._parse(this.currentMetrics[key]);
        const prev = this._parse(this.previousCandleMetrics[key]);
        if (curr == null || prev == null) return null;
        return curr - prev;
    }

    /** Compute aggregate, log direction changes, and notify listeners. */
    _emit() {
        const result = this.aggregate();

        if (result.direction !== this._lastDirection) {
            console.log('[SignalAggregator] Direction: ' +
                (this._lastDirection || 'NONE') + ' → ' + result.direction +
                ' (' + result.agreementCount + '/6)');
            this._lastDirection = result.direction;
        }

        this._listeners.forEach(cb => cb(result));
    }
}

window.SignalAggregator = SignalAggregator;
