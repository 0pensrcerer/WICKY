/**
 * SignalAggregator — evaluates 6 market indicators and emits a composite
 * buy / sell / neutral signal on every data update.
 *
 * All thresholds are configurable via setSettings(). Defaults are exported
 * as SIGNAL_DEFAULTS so the settings UI can reference them.
 *
 * Individual signals: +1 = BUY, 0 = NEUTRAL, -1 = SELL
 * Total ranges from -6 (max sell) to +6 (max buy).
 */

const SIGNAL_DEFAULTS = {
    priceAction: {
        enabled:   true,
        threshold: 0.05   // $ below candle open before SELL triggers
    },
    darkPool: {
        enabled: true
        // logic is always "DP < price → BUY, DP > price → SELL" — no numeric threshold
    },
    nof: {
        enabled:   true,
        buyAbove:  0,     // NOFA delta must be > this for BUY  (supports k/m/b)
        sellBelow: 0      // NOFA delta must be < this for SELL (enter 0 or negative)
    },
    momoFlow: {
        enabled:   true,
        buyAbove:  0,     // MomoFlow value must be > this for BUY
        sellBelow: 0      // MomoFlow value must be < this for SELL
    },
    mmSkew: {
        enabled:   true,
        buyAbove:  0,
        sellBelow: 0
    },
    gex: {
        enabled:   true,
        buyAbove:  0,     // GEX/CallHP delta must be > this for BUY
        sellBelow: 0      // GEX/CallHP delta must be < this for SELL
    }
};

class SignalAggregator {
    constructor(settings) {
        this.settings = this._merge(settings || {});

        this.currentMetrics = {};
        this.previousCandleMetrics = {};
        this.currentPrice = null;
        this.candleOpenPrice = null;
        this._currentMinuteKey = null;
        this._listeners = [];
        this._lastDirection = null;

        console.log('[SignalAggregator] Initialized with settings:', this.settings);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /** Register a callback invoked on every signal update. */
    onUpdate(callback) {
        this._listeners.push(callback);
    }

    /**
     * Replace active settings (deep-merged with defaults) and re-evaluate.
     * Call this whenever the user saves new settings.
     */
    setSettings(settings) {
        this.settings = this._merge(settings || {});
        console.log('[SignalAggregator] Settings updated:', this.settings);
        this._emit();
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

    /** Feed the latest full metrics object (from chrome.storage extractedData). */
    updateMetrics(data) {
        if (!data || typeof data !== 'object') return;
        this.currentMetrics = data;
        this._emit();
    }

    /** Compute and return the current aggregate result (does not emit). */
    aggregate() {
        const signals = {
            priceAction: this._priceActionSignal(),
            darkPool:    this._darkPoolSignal(),
            nof:         this._nofSignal(),
            momoFlow:    this._momoFlowSignal(),
            mmSkew:      this._mmSkewSignal(),
            gex:         this._gexSignal()
        };

        const values      = Object.values(signals);
        const buyCount    = values.filter(v => v ===  1).length;
        const sellCount   = values.filter(v => v === -1).length;
        const total       = buyCount - sellCount;

        let direction, agreementCount;
        if (total > 0)      { direction = 'BUY';     agreementCount = buyCount; }
        else if (total < 0) { direction = 'SELL';    agreementCount = sellCount; }
        else                { direction = 'NEUTRAL';  agreementCount = 0; }

        return { signals, buyCount, sellCount, total, direction, agreementCount,
                 timestamp: new Date().toISOString() };
    }

    // ── Individual signal evaluators ────────────────────────────────────────

    /**
     * Price Action: price >= (candle open − threshold) = BUY, else SELL.
     */
    _priceActionSignal() {
        const cfg = this.settings.priceAction;
        if (!cfg.enabled) return 0;
        if (this.currentPrice == null || this.candleOpenPrice == null) return 0;

        const diff   = this.currentPrice - this.candleOpenPrice;
        const signal = diff >= -cfg.threshold ? 1 : -1;
        console.log('[SignalAggregator][PA] price=' + this.currentPrice +
            ' open=' + this.candleOpenPrice +
            ' diff=' + diff.toFixed(3) +
            ' threshold=-' + cfg.threshold + ' → ' + signal);
        return signal;
    }

    /**
     * Dark Pool: DP print below current price = BUY, above = SELL.
     */
    _darkPoolSignal() {
        const cfg = this.settings.darkPool;
        if (!cfg.enabled) return 0;

        const dp = this._parse(this.currentMetrics['Dark Pool']);
        if (dp == null || this.currentPrice == null) return 0;

        const signal = dp < this.currentPrice ? 1 : dp > this.currentPrice ? -1 : 0;
        console.log('[SignalAggregator][DP] dp=' + dp +
            ' price=' + this.currentPrice + ' → ' + signal);
        return signal;
    }

    /**
     * NOF: NOFA delta vs previous candle compared against buyAbove / sellBelow.
     */
    _nofSignal() {
        const cfg = this.settings.nof;
        if (!cfg.enabled) return 0;

        const curr = this._parse(this.currentMetrics['NOFA']);
        const prev = this._parse(this.previousCandleMetrics['NOFA']);
        if (curr == null || prev == null) return 0;

        const delta  = curr - prev;
        let signal;
        if      (delta > cfg.buyAbove)  signal =  1;
        else if (delta < cfg.sellBelow) signal = -1;
        else                            signal =  0;

        console.log('[SignalAggregator][NOF] curr=' + curr + ' prev=' + prev +
            ' Δ=' + delta + ' buyAbove=' + cfg.buyAbove +
            ' sellBelow=' + cfg.sellBelow + ' → ' + signal);
        return signal;
    }

    /**
     * MomoFlow: value compared against buyAbove / sellBelow thresholds.
     */
    _momoFlowSignal() {
        const cfg = this.settings.momoFlow;
        if (!cfg.enabled) return 0;

        const value = this._parse(this.currentMetrics['MomoFlow']);
        if (value == null) return 0;

        let signal;
        if      (value > cfg.buyAbove)  signal =  1;
        else if (value < cfg.sellBelow) signal = -1;
        else                            signal =  0;

        console.log('[SignalAggregator][MOMO] value=' + value +
            ' buyAbove=' + cfg.buyAbove + ' sellBelow=' + cfg.sellBelow + ' → ' + signal);
        return signal;
    }

    /**
     * MM Skew: value compared against buyAbove / sellBelow thresholds.
     * Prefers "MM Skew" field; falls back to "SmartFlow".
     */
    _mmSkewSignal() {
        const cfg = this.settings.mmSkew;
        if (!cfg.enabled) return 0;

        const raw   = ('MM Skew' in this.currentMetrics)
            ? this.currentMetrics['MM Skew']
            : this.currentMetrics['SmartFlow'];
        const value = this._parse(raw);
        if (value == null) return 0;

        let signal;
        if      (value > cfg.buyAbove)  signal =  1;
        else if (value < cfg.sellBelow) signal = -1;
        else                            signal =  0;

        console.log('[SignalAggregator][SKEW] value=' + value +
            ' buyAbove=' + cfg.buyAbove + ' sellBelow=' + cfg.sellBelow + ' → ' + signal);
        return signal;
    }

    /**
     * GEX: delta of GEX (or Call HP) vs previous candle compared against thresholds.
     * BUY if either GEX or CallHP delta exceeds buyAbove.
     * SELL if both are below sellBelow (when both available), or single delta < sellBelow.
     */
    _gexSignal() {
        const cfg = this.settings.gex;
        if (!cfg.enabled) return 0;

        const gexKey    = 'GEX' in this.currentMetrics ? 'GEX' : 'Gamma Gravity All';
        const gexDelta  = this._delta(gexKey);
        const callDelta = this._delta('Call Wall All');

        if (gexDelta == null && callDelta == null) return 0;

        let signal;
        if (gexDelta != null && callDelta != null) {
            if (gexDelta > cfg.buyAbove || callDelta > cfg.buyAbove)       signal =  1;
            else if (gexDelta < cfg.sellBelow && callDelta < cfg.sellBelow) signal = -1;
            else                                                             signal =  0;
        } else {
            const delta = gexDelta != null ? gexDelta : callDelta;
            if      (delta > cfg.buyAbove)  signal =  1;
            else if (delta < cfg.sellBelow) signal = -1;
            else                            signal =  0;
        }

        console.log('[SignalAggregator][GEX] ' + gexKey + ' Δ=' + gexDelta +
            ' CallHP Δ=' + callDelta + ' buyAbove=' + cfg.buyAbove +
            ' sellBelow=' + cfg.sellBelow + ' → ' + signal);
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

    /** Deep-merge caller-supplied settings over SIGNAL_DEFAULTS. */
    _merge(overrides) {
        const result = {};
        Object.keys(SIGNAL_DEFAULTS).forEach(key => {
            result[key] = Object.assign({}, SIGNAL_DEFAULTS[key], overrides[key] || {});
        });
        return result;
    }

    /** Compute aggregate, log direction changes, notify listeners. */
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

window.SignalAggregator  = SignalAggregator;
window.SIGNAL_DEFAULTS   = SIGNAL_DEFAULTS;
