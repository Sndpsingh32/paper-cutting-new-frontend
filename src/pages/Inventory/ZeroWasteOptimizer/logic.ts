/**
 * LEGACY/FALLBACK-ONLY ZeroWaste optimizer.
 * Primary optimization ownership is Python + OR-Tools via Node proxy (/zerowaste/*).
 * Keep this module for resilience/fallback parity only; do not add new primary logic here.
 */
import { Reel, SizeUnit } from "../../../types/reel";
import { OrderRow, OptimizationResult, StripLayout, OPT_CONFIG } from "./types";
import { toMm, toCm, calcAvailableLengthCm, shuffle, isOrderQualityMatch } from "./helpers";

export async function optimizeOrders(reel: Reel, orders: OrderRow[], rnd: () => number, originalOrders?: OrderRow[]): Promise<OptimizationResult[]> {
    const origMap = new Map<string, number>();
    if (originalOrders) originalOrders.forEach(o => origMap.set(o.id, Number(o.qty) || 0));
    else orders.forEach(o => origMap.set(o.id, Number(o.qty) || 0));

    const validOrders = orders.map(o => ({
        ...o,
        qty: o.qty ? String(o.qty) : "1000"
    })).filter(o => o.reelSize && o.cutSize && o.gsm);

    if (validOrders.length === 0) return [];

    const firstOrder = validOrders[0];
    const gsm = Number(firstOrder.gsm) || reel.gsm;
    const reelWidthMm = toMm(reel.width, reel.sizeUnit);
    const availLengthCm = calcAvailableLengthCm(reel, toCm(reel.width, reel.sizeUnit), gsm);

    let candidateHeights: number[] = [];
    validOrders.forEach(o => {
        const h = toMm(Number(o.cutSize), o.cutSizeUnit);
        console.log(`[3STRIP-711] Order ${o.id}: cutSize=${o.cutSize}${o.cutSizeUnit} = ${h}mm height added`);
        candidateHeights.push(h);
    });
    candidateHeights = Array.from(new Set(candidateHeights)).filter(h => h > 0 && h <= 5000);
    console.log(`[3STRIP-711] Reel ${reel.reelNo || reel._id}: width=${reelWidthMm}mm, heights=[${candidateHeights.join(', ')}]`);

    // Tolerance for adjusting widths to achieve zero waste (e.g., if 718mm waste exists for 711.2mm requirement)
    const ADJUSTMENT_TOLERANCE_MM = 25;

    const calculateForSet = (masterH: number, targetOrders: OrderRow[], isRandomMode = false): OptimizationResult[] => {
        console.log(`[3STRIP-711] === CALCULATE masterH=${masterH}mm, orders=${targetOrders.length}, isRandom=${isRandomMode} ===`);
        targetOrders.forEach(o => {
            const w = toMm(Number(o.reelSize), o.reelSizeUnit);
            const widthInch = w / 25.4;
            console.log(`[3STRIP-711] Order ${o.id}: ${w}mm (${widthInch.toFixed(1)}"), ${o.qty} sheets`);
        });

        const masterCutLenCm = toCm(masterH, SizeUnit.MM);
        const cutsInFullRoll = Math.floor(availLengthCm / masterCutLenCm);
        if (cutsInFullRoll <= 0) return [];


        const remainingQtyMapAtStart = new Map<string, number>();
        orders.forEach(o => remainingQtyMapAtStart.set(o.id, Number(o.qty)));

        const matchesReelQuality = (order: OrderRow) => isOrderQualityMatch(order.quality, reel.quality);

        const validOrdersInfo: { order: OrderRow; widthMm: number; heightMm: number; pcsPerCut: number; rotated: boolean; qtyNeeded: number }[] = [];
        targetOrders.forEach(order => {
            if (!matchesReelQuality(order)) return;
            const qtyInMap = remainingQtyMapAtStart.get(order.id) || 0;
            if (qtyInMap <= 0) return;
            const w = toMm(Number(order.reelSize), order.reelSizeUnit);
            const l = toMm(Number(order.cutSize), order.cutSizeUnit);
            if (w <= 0 || l <= 0) return;

            // 🌾 GRAIN DIRECTION LOGIC
            // In a roll, grain is ALWAYS along the length (heightMm).
            let finalW = w;
            let finalH = l;

            if (order.grain === "Long") {
                // Customer wants grain along the LONG side
                if (w > l) {
                    finalW = l;
                    finalH = w;
                }
            } else if (order.grain === "Short") {
                // Customer wants grain along the SHORT side
                if (l > w) {
                    finalW = l;
                    finalH = w;
                }
            }

            validOrdersInfo.push({ order, widthMm: finalW, heightMm: finalH, pcsPerCut: 1, rotated: (finalW !== w), qtyNeeded: qtyInMap });
        });

        if (validOrdersInfo.length === 0) return [];
        if (isRandomMode) shuffle(validOrdersInfo, rnd);

        // --- Pattern Generation & Simulation Scoring ---
        interface Pattern { counts: number[]; usedWidth: number; trim: number; score: number; }
        const patterns: Pattern[] = [];
        const seenAtLeaf = new Set<string>();
        const dfsStartTime = Date.now();

        const dfs = (idx: number, currentCounts: number[], currentUsed: number) => {
            if (patterns.length > OPT_CONFIG.MAX_DFS_PATTERNS) return;
            if (Date.now() - dfsStartTime > OPT_CONFIG.DFS_TIMEOUT_MS) return;
            if (currentUsed > reelWidthMm + 0.1) return;

            if (idx === validOrdersInfo.length) {
                if (currentUsed > 0 && currentUsed <= reelWidthMm + 0.1) {
                    const key = currentCounts.join('|');
                    if (seenAtLeaf.has(key)) return;
                    seenAtLeaf.add(key);
                    const trim = reelWidthMm - currentUsed;
                    const usedPercent = (currentUsed / reelWidthMm) * 100;
                    let localScore = 0;
                    if (usedPercent >= 99) localScore += 100000;
                    else if (usedPercent >= 95) localScore += 70000;
                    if (trim < 1) localScore += 200000; // Boosted Bonus
                    else if (trim >= OPT_CONFIG.TRIM_USEFUL_MIN_MM) localScore += 10000;
                    else if (trim > 0) localScore -= 80000;
                    const distinctOrders = currentCounts.filter(c => c > 0).length;
                    if (distinctOrders >= 2) localScore += 50000;
                    patterns.push({ counts: [...currentCounts], usedWidth: currentUsed, trim, score: localScore });
                }
                return;
            }
            const info = validOrdersInfo[idx];
            const sheetsPerStrip = info.heightMm > 0 ? Math.floor(availLengthCm / (info.heightMm / 10)) : 0;
            const maxByWidth = Math.floor(reelWidthMm / (info.widthMm - ADJUSTMENT_TOLERANCE_MM));
            const maxStrips = Math.min(maxByWidth, Math.ceil(info.qtyNeeded / (sheetsPerStrip || 1)) + 5);

            for (let c = 0; c <= maxStrips; c++) {
                if (c === 0 || (currentUsed + c * info.widthMm <= reelWidthMm + 0.1)) {
                    currentCounts.push(c);
                    dfs(idx + 1, currentCounts, currentUsed + c * info.widthMm);
                    currentCounts.pop();
                }
            }
        };

        dfs(0, [], 0);
        if (patterns.length === 0) return [];

        const ratedPatterns = patterns.map(p => {
            // Simulation of chained mid-strip filling for better scoring
            const localRemaining = new Map<string, number>(remainingQtyMapAtStart);
            let totYield = 0;
            for (let i = 0; i < validOrdersInfo.length; i++) {
                const count = p.counts[i];
                if (count <= 0) continue;
                const info = validOrdersInfo[i];
                const hCm = info.heightMm / 10;
                for (let k = 0; k < count; k++) {
                    let rLen = availLengthCm;
                    // Primary
                    const need = localRemaining.get(info.order.id) || 0;
                    if (need > 0) {
                        const use = Math.min(need, Math.floor(rLen / hCm));
                        rLen -= (use * hCm);
                        localRemaining.set(info.order.id, Math.max(0, need - use));
                        totYield += use;
                    }
                    // Chained adjustment simulation
                    for (const o of orders) {
                        if (!matchesReelQuality(o)) continue;
                        const oNeed = localRemaining.get(o.id) || Number(o.qty);
                        if (oNeed > 0 && Math.abs(toMm(Number(o.reelSize), o.reelSizeUnit) - info.widthMm) <= ADJUSTMENT_TOLERANCE_MM) {
                            const oHCm = toMm(Number(o.cutSize), o.cutSizeUnit) / 10;
                            const fill = Math.min(oNeed, Math.floor(rLen / oHCm));
                            rLen -= (fill * oHCm);
                            localRemaining.set(o.id, Math.max(0, oNeed - fill));
                            totYield += fill;
                        }
                    }
                    totYield += Math.floor(rLen / hCm);
                }
            }
            const totalReq = Array.from(remainingQtyMapAtStart.values()).reduce((a, b) => a + b, 0);
            const unfill = Array.from(localRemaining.values()).reduce((a, b) => a + b, 0);
            const uP = unfill / (totalReq || 1);
            let s = p.score;
            if (uP > 0.05) s -= 120000;
            s -= uP * 10000;
            return { p, s };
        }).sort((a, b) => b.s - a.s);

        const results: OptimizationResult[] = [];
        for (const bestPattern of ratedPatterns.slice(0, 10).map(x => x.p)) {
            const strips: StripLayout[] = [];
            const localRemainingQtyMap = new Map<string, number>(remainingQtyMapAtStart);
            const totalSlitsInPattern = bestPattern.counts.reduce((a, b) => a + b, 0);
            let physicalSlitCounter = 1;

            for (let i = 0; i < validOrdersInfo.length; i++) {
                const count = bestPattern.counts[i];
                if (count <= 0) continue;
                const info = validOrdersInfo[i];
                const stripHeightCm = info.heightMm / 10;

                for (let k = 0; k < count; k++) {
                    let remLenCm = availLengthCm;
                    const physicalSlitHeader = `[Slit ${physicalSlitCounter}/${totalSlitsInPattern}]`;
                    let segmentIndex = 1;

                    let primaryNeeded = localRemainingQtyMap.get(info.order.id) || 0;
                    if (primaryNeeded > 0) {
                        const usable = Math.min(primaryNeeded, Math.floor(remLenCm / stripHeightCm));
                        strips.push({
                            orderId: info.order.id,
                            client: `${physicalSlitHeader} Seg ${physicalSlitCounter}.${segmentIndex}: ${info.order.client || 'Party'} (Primary)`,
                            clientName: info.order.client || 'Party',
                            reelSize: info.widthMm,
                            cutSize: info.heightMm,
                            count: 1,
                            sheetsPerStrip: Math.floor(availLengthCm / stripHeightCm),
                            totalSheets: usable,
                            usableSheets: usable,
                            requestedSheets: info.qtyNeeded,
                            originalOrderQty: origMap.get(info.order.id) || info.qtyNeeded,
                            excessSheets: 0,
                            excessSheetsPercent: 0,
                            isRotated: info.rotated,
                            mode: 'Fixed',
                            slitIndex: physicalSlitCounter
                        });
                        remLenCm -= (usable * stripHeightCm);
                        localRemainingQtyMap.set(info.order.id, Math.max(0, primaryNeeded - usable));
                        segmentIndex++;
                    }

                    // 2. Chained Scavenging: fill shortfall only from same-quality orders
                    if (remLenCm > 10) {
                        for (const o of orders) {
                            if (!matchesReelQuality(o)) continue;
                            const oNeed = localRemainingQtyMap.get(o.id) ?? (Number(o.qty) || 0);
                            if (oNeed <= 0) continue;

                            const oWidth = toMm(Number(o.reelSize), o.reelSizeUnit);
                            if (Math.abs(oWidth - info.widthMm) <= ADJUSTMENT_TOLERANCE_MM) {
                                const oH = toMm(Number(o.cutSize), o.cutSizeUnit);
                                const oHCm = oH / 10;
                                if (oHCm > 0) {
                                    const fill = Math.min(oNeed, Math.floor(remLenCm / oHCm));
                                    if (fill > 0) {
                                        strips.push({
                                            orderId: o.id,
                                            client: `${physicalSlitHeader} Seg ${physicalSlitCounter}.${segmentIndex}: ${o.client || 'Party'} (Adjust from Slit ${physicalSlitCounter})`,
                                            clientName: o.client || 'Party',
                                            reelSize: info.widthMm,
                                            cutSize: oH,
                                            count: 0,
                                            sheetsPerStrip: Math.floor(availLengthCm / oHCm),
                                            totalSheets: fill,
                                            usableSheets: fill,
                                            requestedSheets: Number(o.qty),
                                            originalOrderQty: origMap.get(o.id) || Number(o.qty),
                                            excessSheets: 0,
                                            excessSheetsPercent: 0,
                                            isRotated: false,
                                            mode: 'Fixed',
                                            slitIndex: physicalSlitCounter
                                        });
                                        remLenCm -= (fill * oHCm);
                                        localRemainingQtyMap.set(o.id, Math.max(0, oNeed - fill));
                                        segmentIndex++;
                                    }
                                }
                            }
                        }
                    }

                    // 3. Record Excess only on the final segment of the adjusted slit
                    if (remLenCm > 10 && strips.length > 0) {
                        const last = strips[strips.length - 1];
                        const extra = Math.floor(remLenCm / (last.cutSize / 10));
                        if (extra > 0) {
                            last.totalSheets += extra;
                            last.excessSheets = extra;
                            last.excessSheetsPercent = (extra / last.totalSheets) * 100;
                        }
                    }
                    physicalSlitCounter++;
                }
            }

            const totalUsable = strips.reduce((s, sl) => s + sl.usableSheets, 0);
            const totalYield = strips.reduce((s, sl) => s + sl.totalSheets, 0);

            const activeSlitWidths: number[] = [];
            const processedSlitIds = new Set<number>();
            strips.forEach(s => {
                const slitMatch = s.client.match(/\[Slit (\d+)\/\d+\]/);
                if (slitMatch && s.usableSheets > 0) {
                    const id = parseInt(slitMatch[1]);
                    if (processedSlitIds.has(id)) return; // Already counted this physical slit
                    processedSlitIds.add(id);
                    activeSlitWidths.push(s.reelSize);
                }
            });
            const usedWidthCalculated = activeSlitWidths.reduce((a, b) => a + b, 0);

            if (totalUsable === 0) continue;

            const extraSheets = totalYield - totalUsable;
            const totalRequestedNow = targetOrders.reduce((s, o) => s + (Number(o.qty) || 0), 0);

            const trimWasteMm = reelWidthMm - usedWidthCalculated;
            const tWastePct = (trimWasteMm / reelWidthMm) * 100;
            let score = 1000;
            const allOrderWidthsMm = validOrders.map(o => toMm(Number(o.reelSize), o.reelSizeUnit)).filter(w => w > 0);
            let trimBestMatchMm = 0; let trimBestMatchDiff = Infinity; let trimIsAdjustable = false;

            // Check 1: Can waste directly match an order width?
            for (const w of allOrderWidthsMm) {
                const diff = Math.abs(trimWasteMm - w);
                if (diff < trimBestMatchDiff) { trimBestMatchDiff = diff; trimBestMatchMm = w; }
                // Also check if this order can be adjusted (±25mm) to match waste
                if (diff <= ADJUSTMENT_TOLERANCE_MM && diff < trimBestMatchDiff) {
                    trimBestMatchDiff = diff;
                    trimBestMatchMm = w;
                    trimIsAdjustable = true;
                }
            }

            // Check 2: Can adjusting an order width (±25mm) achieve ZERO WASTE?
            // This happens when: usedWidth + (orderWidth ± adjustment) = reelWidth
            if (trimWasteMm > 1 && trimWasteMm < ADJUSTMENT_TOLERANCE_MM + 50) {
                // Waste is small - check if any order can expand to fill it
                for (const order of validOrders) {
                    const orderWidthMm = toMm(Number(order.reelSize), order.reelSizeUnit);
                    // Calculate how much this order needs to expand to fill the waste
                    const expansionNeeded = trimWasteMm; // Each strip needs to expand by this much
                    const expansionPerStrip = expansionNeeded / bestPattern.counts.reduce((a: number, b: number) => a + b, 0);

                    // Check if expansion is within ±25mm tolerance
                    if (expansionPerStrip <= ADJUSTMENT_TOLERANCE_MM && expansionPerStrip > 0) {
                        trimIsAdjustable = true;
                        trimBestMatchMm = orderWidthMm;
                        break;
                    }
                }
            }

            const trimMatchesOrderWidth = trimBestMatchDiff <= OPT_CONFIG.TRIM_MATCH_TOLERANCE_MM || trimIsAdjustable;
            const trimIsPerfect = trimWasteMm < 1;
            const isUsableTrim = trimWasteMm >= OPT_CONFIG.TRIM_USEFUL_MIN_MM || trimIsPerfect || trimMatchesOrderWidth;

            if (trimIsPerfect) score += 50000; // Perfect fit bonus
            else if (trimMatchesOrderWidth) { score += 20000; score -= tWastePct * 5; }
            else if (trimWasteMm >= OPT_CONFIG.TRIM_USEFUL_MIN_MM) { score += 10000; score -= tWastePct * 10; }
            else score -= 10000 + (tWastePct * 100);

            if (totalYield >= totalRequestedNow) score += 5000; // Better bonus for fulfilling requirements
            if (totalYield > 0) score -= (extraSheets / totalYield) * 100;
            const uniqueOrderIds = new Set(strips.map(s => s.orderId));
            if (uniqueOrderIds.size > 1) score += 25000 * uniqueOrderIds.size; // Strong bonus for combining orders
            if (trimIsPerfect) score += 200000; // Absolute Top Priority for Near Zero Waste
            if (uniqueOrderIds.size === 1 && Math.abs(totalYield - totalRequestedNow) <= (totalRequestedNow * 0.02)) score += 5000;
            if (totalUsable === 0) score -= 10000;            // --- RESTORE YELLOW TIP SUGGESTION ---
            const optimizations: string[] = [];
            const wasteReasons: string[] = [];
            let actionableAdjustment: OptimizationResult['actionableAdjustment'] = undefined;

            if (trimIsAdjustable && trimWasteMm >= 10) {
                const totalStripsCount = strips.filter(s => s.totalSheets > 0).length;
                if (totalStripsCount > 0) {
                    const adjustmentPerStrip = trimWasteMm / totalStripsCount;
                    optimizations.push(`Slight expansion (~${adjustmentPerStrip.toFixed(1)}mm per strip) can achieve Zero Waste`);
                    const firstActive = strips.find(s => s.totalSheets > 0);
                    if (firstActive && firstActive.orderId) {
                        const origOrder = validOrders.find(o => o.id === firstActive.orderId);
                        const isInch = origOrder?.reelSizeUnit === SizeUnit.INCH;
                        const isCm = origOrder?.reelSizeUnit === SizeUnit.CM;
                        const targetWidthMm = Math.floor((firstActive.reelSize + adjustmentPerStrip) * 10) / 10;
                        const labelTarget = isInch ? `${parseFloat((targetWidthMm / 25.4).toFixed(2))}inch` : isCm ? `${parseFloat((targetWidthMm / 10).toFixed(2))}cm` : `${targetWidthMm.toFixed(1)}mm`;

                        actionableAdjustment = {
                            orderId: firstActive.orderId,
                            adjustToWidthMm: targetWidthMm,
                            label: `Expand to ${labelTarget}`
                        };
                    }
                }
            }

            // 🚀 High-Impact Suggestion: "One More Slit Match" (Halka Sa Change)
            // If the side-cut is ALMOST large enough for one more slit, suggest shrinking.
            if (!actionableAdjustment && !trimIsPerfect) {
                const activeOrderIds = new Set(strips.filter(s => s.totalSheets > 0).map(s => s.orderId));
                const candidates = validOrdersInfo
                    .map(info => ({
                        info,
                        gap: info.widthMm - trimWasteMm,
                        isInLayout: activeOrderIds.has(info.order.id)
                    }))
                    .filter(c => c.gap > 0 && c.gap <= 28) // Up to 1.1 inch gap
                    .sort((a, b) => {
                        if (a.isInLayout && !b.isInLayout) return -1;
                        if (!a.isInLayout && b.isInLayout) return 1;
                        return a.gap - b.gap;
                    });

                if (candidates.length > 0) {
                    const { info } = candidates[0];
                    const targetWidthMm = Math.floor(trimWasteMm * 100) / 100;
                    const isInch = info.order.reelSizeUnit === SizeUnit.INCH;
                    const labelTarget = isInch ? `${parseFloat((targetWidthMm / 25.4).toFixed(3))}inch` : `${targetWidthMm.toFixed(1)}mm`;

                    const originalWidthLabel = info.rotated
                        ? `${info.order.cutSize}${info.order.cutSizeUnit}`
                        : `${info.order.reelSize}${info.order.reelSizeUnit}`;

                    actionableAdjustment = {
                        orderId: info.order.id,
                        adjustToWidthMm: targetWidthMm,
                        isWidthRotated: info.rotated, // Track if we are adjusting the rotated dimension
                        label: `Fit extra slit by reducing ${originalWidthLabel} to ${labelTarget}`
                    };
                    score += 80000;
                }
            }

            // 🎁 Distribution Suggestion: Fill small waste (Halka Sa Distribute)
            if (!actionableAdjustment && trimWasteMm > 10 && trimWasteMm <= 53) {
                const activeStrips = strips.filter(s => s.totalSheets > 0);
                if (activeStrips.length > 0) {
                    const addTotalMm = trimWasteMm;
                    const firstOrdInfo = validOrdersInfo.find(vi => vi.order.id === activeStrips[0].orderId);

                    if (firstOrdInfo) {
                        const currentWidth = firstOrdInfo.widthMm;
                        const newWidthMm = currentWidth + addTotalMm;
                        const isInch = firstOrdInfo.order.reelSizeUnit === SizeUnit.INCH;

                        actionableAdjustment = {
                            orderId: firstOrdInfo.order.id,
                            adjustToWidthMm: newWidthMm,
                            isWidthRotated: firstOrdInfo.rotated,
                            label: `Distribute ~${(trimWasteMm / (isInch ? 25.4 : 1)).toFixed(2)}${isInch ? '"' : 'mm'} waste into layout for Zero Waste`
                        };
                        score += 30000;
                    }
                }
            }

            // 💡 SMART SNAP SUGGESTION: Can we fit 1 MORE strip by reducing width slightly?
            if (!actionableAdjustment) {
                const activeStrips = strips.filter(s => s.totalSheets > 0);
                if (activeStrips.length > 0) {
                    const avgWidth = activeStrips.reduce((sum, s) => sum + s.reelSize, 0) / activeStrips.length;
                    const uniqueSlitCount = new Set(activeStrips.map(s => { const m = s.client.match(/\[Slit (\d+)\//); return m ? m[1] : '0'; })).size;
                    const nextSlitCount = uniqueSlitCount + 1;
                    // How much do we need to reduce each strip so that one extra fits?
                    // Formula: nextSlitCount * (avgWidth - reduction) = reelWidthMm
                    // => reduction = avgWidth - (reelWidthMm / nextSlitCount)
                    const reductionPerStrip = avgWidth - (reelWidthMm / nextSlitCount);
                    if (reductionPerStrip > 0 && reductionPerStrip <= 25.4) {
                        const targetWidth = reelWidthMm / nextSlitCount;
                        optimizations.push(`Reduce width by ~${reductionPerStrip.toFixed(1)}mm per strip (${(avgWidth - reductionPerStrip).toFixed(1)}mm total) to fit ${nextSlitCount} strips and achieve Zero Waste`);
                        if (!actionableAdjustment && activeStrips[0].orderId) {
                            const origOrder = validOrders.find(o => o.id === activeStrips[0].orderId);
                            const isInch = origOrder?.reelSizeUnit === SizeUnit.INCH;
                            const isCm = origOrder?.reelSizeUnit === SizeUnit.CM;
                            const targetWidthMm = Math.floor(targetWidth * 10) / 10;
                            const labelTarget = isInch ? `${parseFloat((targetWidthMm / 25.4).toFixed(2))}inch` : isCm ? `${parseFloat((targetWidthMm / 10).toFixed(2))}cm` : `${targetWidthMm.toFixed(1)}mm`;

                            actionableAdjustment = {
                                orderId: activeStrips[0].orderId,
                                adjustToWidthMm: targetWidthMm,
                                label: `Reduce to ${labelTarget}`
                            };
                        }
                    }
                }
            }

            // Suggestion 2: Add more slits if space exists (Extra Slit Suggestion)
            const sortedOrderWidths = allOrderWidthsMm.sort((a, b) => b - a);
            for (const w of sortedOrderWidths) {
                if (trimWasteMm >= w) {
                    const extraPossible = Math.floor(trimWasteMm / w);
                    const matchingOrder = validOrders.find(o => toMm(Number(o.reelSize), o.reelSizeUnit) === w);
                    if (matchingOrder) {
                        optimizations.push(`Add ${extraPossible} extra slit(s) of ${matchingOrder.client || 'Party'} (${w.toFixed(1)}mm) to utilize the side-cut`);
                        break;
                    }
                }
            }

            const totalWeightKg = strips.reduce((total, s) => {
                const w = s.reelSize;
                const h = s.cutSize;
                const sheets = s.totalSheets;
                const segmentWeight = (w * h * sheets * (Number(gsm) || 0)) / 1000000000;
                return total + segmentWeight;
            }, 0);

            let finalScore = score;
            if (trimIsAdjustable) finalScore += 50000;
            const finalTrimPct = (trimWasteMm / reelWidthMm) * 100;

            results.push({
                reel, orders: targetOrders, stripsLayout: strips, totalReelWidthUsed: usedWidthCalculated, reelWidth: reelWidthMm,
                trimWasteMm: trimWasteMm, trimWastePercent: finalTrimPct, trimIsUsable: isUsableTrim,
                trimMatchesOrderWidth, trimBestMatchMm, trimIsAdjustableMatch: trimIsAdjustable,
                lengthWasteSheets: extraSheets, lengthWastePercent: (totalYield > 0 ? (extraSheets / totalYield) * 100 : 0),
                totalOrderedSheets: totalRequestedNow, rollYieldSheets: totalYield, totalUsableSheets: totalUsable,
                totalWeightKg: totalWeightKg.toFixed(2),
                isZeroWaste: trimWasteMm < 10, approvalNeeded: trimWasteMm >= 10 && finalTrimPct <= 15,
                wasteCategory: trimWasteMm < 10 ? "zero" : (finalTrimPct < 5 ? "low" : "high"),
                recommendation: finalTrimPct < 1 ? "Proceed to Production" : "Ask Customer Approval",
                optimizations,
                wasteReasons,
                actionableAdjustment,
                score: finalScore
            });
        }
        return results;
    };

    const allCandidates: OptimizationResult[] = [];
    const MONTE_CARLO_ITERATIONS =
        validOrders.length <= 2 ? 20 :
            validOrders.length <= 4 ? 40 : 60;

    for (let iter = 0; iter < MONTE_CARLO_ITERATIONS; iter++) {

        const masterH = candidateHeights[Math.floor(rnd() * candidateHeights.length)];
        if (!masterH) continue;
        let shuffled = [...validOrders];
        shuffle(shuffled, rnd);

        if (rnd() > 0.5 && shuffled.length > 1) {
            shuffled = shuffled.slice(0, Math.floor(rnd() * shuffled.length) + 1);
        }
        allCandidates.push(...calculateForSet(masterH, shuffled, true));
        allCandidates.push(...calculateForSet(masterH, [shuffled[0]], true));
    }

    for (const masterH of candidateHeights) {
        for (const order of validOrders) allCandidates.push(...calculateForSet(masterH, [order]));
        if (validOrders.length > 1) allCandidates.push(...calculateForSet(masterH, validOrders));
    }

    const top5ForReel = allCandidates
        .sort((a, b) => b.score - a.score)
        .filter((v, i, a) => {
            const getHash = (opt: OptimizationResult) => opt.stripsLayout
                .map(s => `${s.orderId}_${s.count}_${s.reelSize}`)
                .sort().join('|');
            return a.findIndex(t => getHash(t) === getHash(v)) === i;
        })
        .slice(0, 5);

    if (top5ForReel.length === 0) {
        const reelWidthMm = toMm(reel.width, reel.sizeUnit);
        return [{
            reel, orders, stripsLayout: [], totalReelWidthUsed: 0, reelWidth: reelWidthMm,
            trimWasteMm: reelWidthMm, trimWastePercent: 100,
            trimIsUsable: false, trimMatchesOrderWidth: false, trimBestMatchMm: 0,
            lengthWasteSheets: 0, lengthWastePercent: 0,
            totalOrderedSheets: orders.reduce((s, o) => s + (Number(o.qty) || 0), 0),
            rollYieldSheets: 0, totalUsableSheets: 0,
            totalWeightKg: "0.00",
            isZeroWaste: false, approvalNeeded: false,
            wasteCategory: "high", recommendation: "Reject & Re-optimize",
            optimizations: [], wasteReasons: ["Dimensions mismatch"],
            score: -999, cannotFit: true, cannotFitReason: "No suitable layout found for these dimensions."
        }];
    }

    const results = top5ForReel.map(opt => {
        const primaryUnit = orders[0]?.reelSizeUnit || SizeUnit.MM;
        const sideCutStr = primaryUnit === SizeUnit.INCH ? `${parseFloat((opt.trimWasteMm / 25.4).toFixed(2))}"` : primaryUnit === SizeUnit.CM ? `${parseFloat((opt.trimWasteMm / 10).toFixed(2))} cm` : `${opt.trimWasteMm.toFixed(1)} mm`;

        const combinedWaste = opt.trimWastePercent;
        let wasteCategory: "zero" | "low" | "medium" | "high" = "high";
        let recommendation: string = opt.recommendation;

        if (opt.isZeroWaste || opt.trimWasteMm < 10) {
            wasteCategory = "zero";
            recommendation = "Proceed to Production";
        } else if (opt.trimMatchesOrderWidth) {
            wasteCategory = "low";
            recommendation = `Proceed: Standard Side-cut (${sideCutStr}) produced`;
        } else if (combinedWaste <= 5) {
            wasteCategory = "low";
            recommendation = "Proceed to Production";
        } else if (combinedWaste <= 40) {
            wasteCategory = "medium";
            recommendation = "Ask Customer Approval";
        } else {
            wasteCategory = "high";
            recommendation = "Reject & Re-optimize";
        }

        const canFit = !(combinedWaste > 40 && !opt.trimIsUsable);
        const isPartialReel = (reel.currentBalanceKg < (reel.totalWeightKg || 0)) && (reel.totalWeightKg || 0) > 0;
        // Dead zone: waste between 20-450mm - this roll should take fewer orders
        const isDeadZone = opt.trimWasteMm > 20 && opt.trimWasteMm < 450;

        // --- PROTECT OUR SMART RECOMMENDATION ---
        if (opt.recommendation.includes("Adjust widths") || opt.recommendation.includes("Auto-Optimized") || opt.isZeroWaste) {
            recommendation = opt.recommendation;
        }

        return {
            ...opt,
            wasteCategory,
            recommendation: opt.optimizations.includes("Perfect Single Order Fit") ? "Proceed to Production" : recommendation,
            score: opt.score + (isPartialReel ? 1000 : 0) + (isDeadZone ? -50000 : 0),
            cannotFit: !canFit,
            cannotFitReason: canFit ? "" : `Reject Roll: Waste is extremely high (${combinedWaste.toFixed(1)}%).`,
            isDeadZone
        };
    });

    return results;
}

// 🧬 Genetic Algorithm (CORE UPGRADE)
export async function geneticOptimize(
    reels: Reel[],
    orders: OrderRow[],
    rnd: () => number,
    getCachedOptimization: (r: Reel, ords: OrderRow[], originalOrds?: OrderRow[]) => Promise<OptimizationResult[]>
): Promise<OptimizationResult[]> {
    return _geneticOptimizeLocal(reels, orders, rnd, getCachedOptimization);
}

export async function geneticOptimizeWithFallback(
    reels: Reel[],
    orders: OrderRow[],
    rnd: () => number,
    getCachedOptimization: (r: Reel, ords: OrderRow[], originalOrds?: OrderRow[]) => Promise<OptimizationResult[]>,
    postDataFn?: (url: string, payload: any) => Promise<any>,
    pythonEnabled = String((import.meta as any).env?.VITE_ZEROWASTE_PYTHON_ENABLED || "").toLowerCase() === "true"
): Promise<OptimizationResult[]> {
    if (pythonEnabled && postDataFn) {
        try {
            const res = await postDataFn("/zerowaste/genetic-optimize", { reels, orders, seed: 42 });
            if (res?.success && Array.isArray(res?.data?.sequence)) {
                console.info('[ZeroWaste] genetic-optimize source', { engine: res?.data?.engine || 'python', source: 'backend-proxy' });
                return res.data.sequence as OptimizationResult[];
            }
        } catch (e) {
            console.warn("ZeroWaste Python genetic proxy failed, falling back to local TS optimizer", e);
        }
    }
    return _geneticOptimizeLocal(reels, orders, rnd, getCachedOptimization);
}

async function _geneticOptimizeLocal(
    reels: Reel[],
    orders: OrderRow[],
    rnd: () => number,
    getCachedOptimization: (r: Reel, ords: OrderRow[], originalOrds?: OrderRow[]) => Promise<OptimizationResult[]>
): Promise<OptimizationResult[]> {
    const populationSize = 80;
    const generations = 30;

    // 🎯 Sort orders by quantity DESCENDING - big orders first for complete fit!
    const sortedOrders = [...orders].sort((a, b) => Number(b.qty) - Number(a.qty));
    console.log(`[GENETIC] Orders sorted by qty: ${sortedOrders.map(o => `${o.id}:${o.qty}`).join(', ')}`);

    // 👥 Group orders by width - same width orders should stay together!
    const ordersByWidth = new Map<string, OrderRow[]>();
    sortedOrders.forEach(o => {
        const widthKey = `${o.reelSize}_${o.reelSizeUnit}`;
        if (!ordersByWidth.has(widthKey)) ordersByWidth.set(widthKey, []);
        ordersByWidth.get(widthKey)!.push(o);
    });

    // Sort reels by width ASCENDING - smallest roll first (prefer minimum waste!)
    const totalOrderWidthMm = sortedOrders.reduce((sum, o) => sum + toMm(Number(o.reelSize), o.reelSizeUnit), 0);
    const sortedReels = [...reels].sort((a, b) => {
        const wA = toMm(a.width, a.sizeUnit);
        const wB = toMm(b.width, b.sizeUnit);
        const aCanFit = wA >= totalOrderWidthMm;
        const bCanFit = wB >= totalOrderWidthMm;
        // Smallest viable roll first; if both can or cannot fit, sort ascending
        if (aCanFit && !bCanFit) return -1;
        if (!aCanFit && bCanFit) return 1;
        return wA - wB; // Smallest first
    });
    console.log(`[GENETIC] Reels sorted (smallest viable first, totalOrderWidth=${totalOrderWidthMm.toFixed(0)}mm): ${sortedReels.map(r => `${r.reelNo || r._id}:${toMm(r.width, r.sizeUnit).toFixed(0)}mm`).join(', ')}`);

    // Sort width groups by total quantity descending - groups with big orders first
    const widthGroups = Array.from(ordersByWidth.values()).sort((a, b) => {
        const qtyA = a.reduce((sum, o) => sum + Number(o.qty), 0);
        const qtyB = b.reduce((sum, o) => sum + Number(o.qty), 0);
        return qtyB - qtyA;
    });
    console.log(`[GENETIC] Width groups by qty: ${widthGroups.map(g => `${g[0]?.reelSize}${g[0]?.reelSizeUnit}=${g.reduce((s, o) => s + Number(o.qty), 0)}`).join(', ')}`);

    let population = Array.from({ length: populationSize }, () => {
        // Shuffle within groups but keep groups sorted by total qty
        const shuffledGroups = widthGroups.map(g => [...g].sort(() => rnd() - 0.5));
        // Flatten - big quantity groups first
        const shuffledOrders = shuffledGroups.flat();
        // Slight randomization of reels but keep smallest-viable first generally
        const shuffledReels = [...sortedReels].sort(() => rnd() * 0.3 - 0.15); // Weak shuffle, preserves ascending sort
        return { reels: shuffledReels, orders: shuffledOrders };
    });

    const getScore = async (solution: { reels: Reel[], orders: OrderRow[] }) => {
        let currentOrders = [...solution.orders];
        let sequence: OptimizationResult[] = [];
        let ordersAtStep: OrderRow[][] = []; // Track pending orders snapshot at each reel step

        // 🎯 PRIORITY: Try ALL orders COMBINED on the SMALLEST viable roll first
        if (currentOrders.length > 1) {
            const smallestViableReel = solution.reels.find(r => toMm(r.width, r.sizeUnit) >= totalOrderWidthMm);
            if (smallestViableReel) {
                console.log(`[PRIORITY] Trying ALL ${currentOrders.length} orders combined on smallest viable reel ${smallestViableReel.reelNo || smallestViableReel._id} (${toMm(smallestViableReel.width, smallestViableReel.sizeUnit).toFixed(0)}mm)`);
                const combinedResults = await getCachedOptimization(smallestViableReel, currentOrders, orders);
                const combinedBest = combinedResults
                    .filter(res => !res.cannotFit && new Set(res.stripsLayout.map(s => s.orderId)).size === currentOrders.length)
                    .sort((a, b) => b.score - a.score)[0];
                if (combinedBest) {
                    const allFulfilled = currentOrders.every(o => {
                        const produced = combinedBest.stripsLayout
                            .filter(s => s.orderId === o.id)
                            .reduce((sum, s) => sum + s.usableSheets, 0);
                        return produced >= Number(o.qty) * 0.85;
                    });
                    if (allFulfilled) {
                        console.log(`[PRIORITY] ✅ ALL orders fit combined on smallest viable reel!`);
                        ordersAtStep.push([...currentOrders]);
                        sequence.push(combinedBest);
                        currentOrders = [];
                        let score = combinedBest.score + 500000; // Massive bonus - ideal outcome!
                        return { sequence, score };
                    }
                }
            }
        }

        for (const r of solution.reels.slice(0, 5)) {
            let results = await getCachedOptimization(r, currentOrders, orders);
            let best = results.filter(res => !res.cannotFit).sort((a, b) => b.score - a.score)[0];

            // DEAD ZONE HANDLING: If this roll has dead zone waste, try with fewer orders
            if (best && best.isDeadZone && currentOrders.length > 1) {
                // Try removing one order at a time to find better fit
                for (let i = 0; i < Math.min(currentOrders.length, 3); i++) {
                    const reducedOrders = currentOrders.filter((_, idx) => idx !== i);
                    const reducedResults = await getCachedOptimization(r, reducedOrders, orders);
                    const reducedBest = reducedResults.filter(res => !res.cannotFit).sort((a, b) => b.score - a.score)[0];

                    // If reduced version has better score (no dead zone), use it
                    if (reducedBest && !reducedBest.isDeadZone && reducedBest.score > best.score) {
                        best = reducedBest;
                        // Mark the removed order as remaining
                        const removedOrder = currentOrders[i];
                        best.stripsLayout.push({
                            orderId: removedOrder.id,
                            client: `${removedOrder.client || 'Party'} (Next Roll)`,
                            reelSize: toMm(Number(removedOrder.reelSize), removedOrder.reelSizeUnit),
                            cutSize: toMm(Number(removedOrder.cutSize), removedOrder.cutSizeUnit),
                            count: 0, sheetsPerStrip: 0, totalSheets: 0,
                            usableSheets: 0, requestedSheets: Number(removedOrder.qty),
                            originalOrderQty: Number(removedOrder.qty),
                            excessSheets: 0, excessSheetsPercent: 0, isRotated: false,
                            mode: 'Skip'
                        } as StripLayout);
                        break;
                    }
                }
            }

            if (!best) break;
            ordersAtStep.push([...currentOrders]); // Snapshot before fulfillment
            sequence.push(best);
            const remaining: OrderRow[] = [];
            for (const o of currentOrders) {
                const sheetsProd = best.stripsLayout.filter(s => s.orderId === o.id).reduce((sum, s) => sum + s.usableSheets, 0);
                if (sheetsProd < Number(o.qty)) {
                    remaining.push({ ...o, qty: String(Number(o.qty) - sheetsProd) });
                }
            }
            currentOrders = remaining;
            if (currentOrders.length === 0) break;
        }
        let score = 0;
        for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
            const res = sequence[seqIdx];
            const pendingOrdersSnapshot = ordersAtStep[seqIdx] || [];
            const trim = res.trimWasteMm;
            const reelWidth = res.reelWidth;
            const usedPercent = ((reelWidth - trim) / reelWidth) * 100;

            // Bonus for high fill percentage (95%+)
            if (usedPercent >= 95) {
                score += 50000; // Max fill bonus
            } else if (usedPercent >= 90) {
                score += 30000; // Good fill bonus
            } else if (usedPercent >= 80) {
                score += 10000; // Decent fill
            }

            // Waste scoring
            if (trim <= 20) {
                score += 200000; // Boosted zero-waste bonus
            } else if (trim > 20 && trim < 450) {
                // DEAD ZONE - This roll should have taken more orders!
                score -= 50000 + (trim * 100);
            } else if (trim >= 450) {
                score += 5000; // Usable side-cut reel
            }

            // Bonus for filling more orders in one roll
            const orderCount = new Set(res.stripsLayout.map(s => s.orderId)).size;
            score += orderCount * 5000;

            //  🏆 ULTIMATE MEGA BONUS: Multi-strips of same order in one roll!
            // This is key to keeping 711 together on a large roll
            const stripCountsByOrder = new Map<string, number>();
            res.stripsLayout.filter(s => s.totalSheets > 0).forEach(s => stripCountsByOrder.set(s.orderId, (stripCountsByOrder.get(s.orderId) || 0) + 1));
            stripCountsByOrder.forEach((count, orderId) => {
                if (count >= 2) {
                    score += count * 60000; // MASSIVE bonus for consolidation!
                    console.log(`[CONSOLIDATION BONUS] Order ${orderId}: ${count} strips in one roll!`);
                }
            });

            //  EXTRA BONUS: Same-width orders packed together!
            const widthsInRoll = res.stripsLayout.filter(s => s.totalSheets > 0).map(s => s.reelSize);
            const widthCounts = new Map<number, number>();
            widthsInRoll.forEach(w => widthCounts.set(w, (widthCounts.get(w) || 0) + 1));
            widthCounts.forEach((count, width) => {
                if (count >= 2) {
                    score += count * 20000;
                    console.log(`[GROUPING BONUS] ${count} strips of ${width}mm width in same roll!`);
                }
            });

            //  ULTIMATE MEGA BONUS: ALL pending orders fulfilled in ONE roll (multi-order combine!)
            // This must score HIGHER than single-order fits so the GA prefers combining
            if (orderCount > 1 && pendingOrdersSnapshot.length > 0) {
                const allFulfilled = pendingOrdersSnapshot.every(o => {
                    const produced = res.stripsLayout
                        .filter(s => s.orderId === o.id)
                        .reduce((sum, s) => sum + s.usableSheets, 0);
                    return produced >= Number(o.qty) * 0.90;
                });
                if (allFulfilled) {
                    score += 350000; // BIGGEST bonus - all orders in ONE roll combined!

                } else {
                    // Partial multi-order fit still better than splitting
                    score += 50000;

                }
            }

            // 🎯🏆 MEGA BONUS: Single order COMPLETELY fulfilled in ONE roll!
            if (orderCount === 1) {
                const orderIdInRoll = res.stripsLayout[0]?.orderId;
                const totalUsableInRoll = res.stripsLayout.reduce((sum, s) => sum + s.usableSheets, 0);
                const originalQty = res.stripsLayout[0]?.originalOrderQty || 0;

                if (totalUsableInRoll >= originalQty * 0.95) {
                    score += 200000; // MEGA bonus for complete single-order fit
                    console.log(`[🏆 PERFECT FIT] Order ${orderIdInRoll}: Complete ${totalUsableInRoll}/${originalQty} sheets in ONE roll!`);
                }
            }
        }

        return { sequence, score }; // Higher score = better
    };

    let bestFinalSequence: OptimizationResult[] = [];
    let bestFinalScore = -Infinity;

    for (let gen = 0; gen < generations; gen++) {
        const scoredPopulation = await Promise.all(population.map(async sol => {
            const { sequence, score } = await getScore(sol);
            if (score > bestFinalScore) {
                bestFinalScore = score;
                bestFinalSequence = sequence;
            }
            return { sol, score };
        }));

        const selected = scoredPopulation.sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.sol);
        const nextGen = [...selected];

        while (nextGen.length < populationSize) {
            const p1 = selected[Math.floor(rnd() * selected.length)];
            const p2 = selected[Math.floor(rnd() * selected.length)];
            const childReels = [...p1.reels.slice(0, 1), ...p2.reels.slice(1)];
            const childOrders = rnd() < 0.3 ? [...p1.orders].sort(() => rnd() - 0.5) : [...p1.orders];
            nextGen.push({ reels: childReels, orders: childOrders });
        }
        population = nextGen;
    }

    return bestFinalSequence;
}
