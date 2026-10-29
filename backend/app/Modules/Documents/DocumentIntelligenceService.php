<?php

namespace App\Modules\Documents;

final class DocumentIntelligenceService
{
    /**
     * Regional trade dictionary covering Chinese manufacturing/garment export terms.
     */
    public const GLOSSARY = [
        '工业缝纫机' => 'Industrial Sewing Machine',
        '自动模板机' => 'Automatic Template Sewing Machine',
        '缝纫机' => 'Sewing Machine',
        '裁剪台' => 'Cutting Table',
        '堆垛架' => 'Stacking Rack',
        '周转车' => 'Material Handling Trolley',
        '布料架' => 'Fabric Rack',
        '货架' => 'Storage Rack',
        '发电机' => 'Power Generator',
        '空压机' => 'Air Compressor',
        '拉链' => 'Zipper',
        '金属拉链' => 'Metal Zipper',
        '尼龙拉链' => 'Nylon Zipper',
        '纽扣' => 'Button',
        '金属纽扣' => 'Metal Button',
        '塑料纽扣' => 'Plastic Button',
        '织带' => 'Webbing Tape',
        '魔术贴' => 'Velcro Hook & Loop',
        '梭织布' => 'Woven Fabric',
        '针织布' => 'Knitted Fabric',
        '里布' => 'Lining Fabric',
        '涤纶里布' => 'Polyester Lining Fabric',
        '纯棉面料' => '100% Cotton Fabric',
        '缝纫线' => 'Sewing Thread',
        '吊牌' => 'Hang Tag',
        '洗水唛' => 'Care Label',
        '胶袋' => 'Polybag',
        '纸箱' => 'Carton Box',
        '松紧带' => 'Elastic Band',
        '印花布' => 'Printed Fabric',
        '五金配件' => 'Metal Hardware Accessories',
        '模具' => 'Mould / Tooling Die',
        '工作台' => 'Work Table',
        '熨烫机' => 'Steam Ironing Machine',
    ];

    /**
     * Translate or normalize a Chinese trade term into English.
     */
    public function translate(string $chinese, string $providedEnglish = ''): string
    {
        $trimmed = trim($chinese);
        if (isset(self::GLOSSARY[$trimmed])) {
            return self::GLOSSARY[$trimmed];
        }

        // Substring / partial keyword search
        foreach (self::GLOSSARY as $term => $eng) {
            if (str_contains($trimmed, $term)) {
                return $eng;
            }
        }

        if (! empty(trim($providedEnglish))) {
            return trim($providedEnglish);
        }

        return $chinese;
    }

    /**
     * Normalize string for comparison.
     */
    public function normalize(?string $val): string
    {
        if ($val === null) {
            return '';
        }
        $str = mb_strtolower(trim($val), 'UTF-8');

        return preg_replace('/[^\p{L}\p{N}]+/u', ' ', $str) ?? '';
    }

    /**
     * Parse raw document text/rows or structured payload into metadata & line items.
     */
    public function parseDocument(string $fileName, string $documentType, ?string $rawContent, array $structuredInput = []): array
    {
        $metadata = [
            'invoice_no' => '',
            'invoice_date' => '',
            'contract_no' => '',
            'supplier' => '',
            'consignee' => '',
            'origin' => '',
            'destination' => '',
            'currency' => 'USD',
            'printed_totals' => [],
        ];

        $items = [];

        // If structuredInput already has items, process directly
        if (! empty($structuredInput['items']) && is_array($structuredInput['items'])) {
            $metadata = array_merge($metadata, $structuredInput['metadata'] ?? []);
            foreach ($structuredInput['items'] as $idx => $rawItem) {
                $items[] = $this->formatItemRow($rawItem, $idx + 1);
            }
        } elseif (! empty($rawContent)) {
            // Parse CSV / TSV or delimited text lines
            $lines = preg_split('/\r\n|\r|\n/', trim($rawContent));
            $headerRowIndex = null;
            $columnMap = [];

            foreach ($lines as $i => $line) {
                $trimmed = trim($line);
                if (empty($trimmed)) {
                    continue;
                }

                // Header metadata checks
                $lower = mb_strtolower($trimmed, 'UTF-8');
                if (preg_match('/invoice\s*(?:no|number|#)[:\s]+([^\s,;]+)/i', $trimmed, $m)) {
                    $metadata['invoice_no'] = trim($m[1]);
                }
                if (preg_match('/date[:\s]+([0-9\/-]+)/i', $trimmed, $m)) {
                    $metadata['invoice_date'] = trim($m[1]);
                }
                if (preg_match('/contract\s*(?:no|number|#)[:\s]+([^\s,;]+)/i', $trimmed, $m)) {
                    $metadata['contract_no'] = trim($m[1]);
                }
                if (preg_match('/(?:consignee|to:messers|to)[:\s]+([^,;\n]+)/i', $trimmed, $m) && empty($metadata['consignee'])) {
                    $metadata['consignee'] = trim($m[1]);
                }
                if (preg_match('/(?:supplier|from|shipper)[:\s]+([^,;\n]+)/i', $trimmed, $m) && empty($metadata['supplier'])) {
                    $metadata['supplier'] = trim($m[1]);
                }

                // Table header row detector
                if ($headerRowIndex === null && (str_contains($lower, 'description') || str_contains($lower, '品名')) &&
                    (str_contains($lower, 'qty') || str_contains($lower, 'quantity') || str_contains($lower, '数量') || str_contains($lower, 'hs'))) {
                    $headerRowIndex = $i;
                    $cols = str_getcsv($line);
                    foreach ($cols as $colIdx => $colName) {
                        $cLower = mb_strtolower(trim($colName), 'UTF-8');
                        if (str_contains($cLower, 'hs')) {
                            $columnMap['hs_code'] = $colIdx;
                        } elseif (str_contains($cLower, 'description') || str_contains($cLower, '品名')) {
                            $columnMap['description'] = $colIdx;
                        } elseif (str_contains($cLower, 'english') || str_contains($cLower, '英文')) {
                            $columnMap['english'] = $colIdx;
                        } elseif (str_contains($cLower, 'qty') || str_contains($cLower, 'quantity') || str_contains($cLower, '数量')) {
                            $columnMap['quantity'] = $colIdx;
                        } elseif (str_contains($cLower, 'unit') || str_contains($cLower, '单位')) {
                            $columnMap['unit'] = $colIdx;
                        } elseif (str_contains($cLower, 'price') || str_contains($cLower, '单价')) {
                            $columnMap['price'] = $colIdx;
                        } elseif (str_contains($cLower, 'amount') || str_contains($cLower, 'total') || str_contains($cLower, '总价')) {
                            $columnMap['total'] = $colIdx;
                        } elseif (str_contains($cLower, 'package') || str_contains($cLower, 'ctn') || str_contains($cLower, '件数')) {
                            $columnMap['packages'] = $colIdx;
                        } elseif (str_contains($cLower, 'gross') || str_contains($cLower, 'g.w') || str_contains($cLower, '毛重')) {
                            $columnMap['gross_weight'] = $colIdx;
                        } elseif (str_contains($cLower, 'net') || str_contains($cLower, 'n.w') || str_contains($cLower, '净重')) {
                            $columnMap['net_weight'] = $colIdx;
                        } elseif (str_contains($cLower, 'cbm') || str_contains($cLower, 'volume') || str_contains($cLower, '体积') || str_contains($cLower, 'm3')) {
                            $columnMap['volume'] = $colIdx;
                        }
                    }

                    continue;
                }

                // If after header row, extract items
                if ($headerRowIndex !== null && $i > $headerRowIndex) {
                    $cols = str_getcsv($line);
                    $qtyCol = $columnMap['quantity'] ?? null;
                    if ($qtyCol !== null && isset($cols[$qtyCol])) {
                        $qty = (float) filter_var($cols[$qtyCol], FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
                        if ($qty > 0) {
                            $chinese = isset($columnMap['description']) ? trim($cols[$columnMap['description']] ?? '') : '';
                            $engProvided = isset($columnMap['english']) ? trim($cols[$columnMap['english']] ?? '') : '';

                            $items[] = $this->formatItemRow([
                                'hs_code' => isset($columnMap['hs_code']) ? trim($cols[$columnMap['hs_code']] ?? '') : null,
                                'description_original' => $chinese,
                                'description_english' => $engProvided,
                                'quantity' => $qty,
                                'unit_of_measure' => isset($columnMap['unit']) ? trim($cols[$columnMap['unit']] ?? 'PCS') : 'PCS',
                                'unit_price' => isset($columnMap['price']) ? (float) filter_var($cols[$columnMap['price']] ?? 0, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION) : null,
                                'total_amount' => isset($columnMap['total']) ? (float) filter_var($cols[$columnMap['total']] ?? 0, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION) : null,
                                'package_count' => isset($columnMap['packages']) ? (int) filter_var($cols[$columnMap['packages']] ?? 0, FILTER_SANITIZE_NUMBER_INT) : null,
                                'gross_weight_kg' => isset($columnMap['gross_weight']) ? (float) filter_var($cols[$columnMap['gross_weight']] ?? 0, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION) : null,
                                'net_weight_kg' => isset($columnMap['net_weight']) ? (float) filter_var($cols[$columnMap['net_weight']] ?? 0, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION) : null,
                                'volume_cbm' => isset($columnMap['volume']) ? (float) filter_var($cols[$columnMap['volume']] ?? 0, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION) : null,
                            ], count($items) + 1);
                        }
                    }
                }
            }
        }

        // Calculate confidence score
        $confidence = 85.0;
        if (! empty($metadata['invoice_no'])) {
            $confidence += 5.0;
        }
        if (! empty($items)) {
            $confidence += 5.0;
        }
        if (! empty($metadata['supplier']) && ! empty($metadata['consignee'])) {
            $confidence += 4.5;
        }

        return [
            'metadata' => $metadata,
            'items' => $items,
            'confidence_score' => min(99.0, $confidence),
        ];
    }

    /**
     * Cross-reconcile Commercial Invoice vs Packing List.
     */
    public function reconcile(TradeDocument $invoice, TradeDocument $packingList): array
    {
        $invoiceItems = $invoice->items()->get();
        $packingItems = $packingList->items()->get();

        $invoiceMeta = $invoice->extracted_metadata ?? [];
        $packingMeta = $packingList->extracted_metadata ?? [];

        $unusedPackingIndexes = range(0, count($packingItems) - 1);
        $pairs = [];
        $issues = [];

        if ($packingItems->isEmpty()) {
            $issues[] = 'No packing list items found for cross-reconciliation.';
        }

        foreach ($invoiceItems as $invItem) {
            $bestScore = -1;
            $bestPackingIdx = null;

            foreach ($unusedPackingIndexes as $pIdx) {
                $pkgItem = $packingItems[$pIdx];
                $score = $this->calculatePairRank($invItem, $pkgItem);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestPackingIdx = $pIdx;
                }
            }

            $matchedPkg = null;
            if ($bestScore > 0 && $bestPackingIdx !== null) {
                $matchedPkg = $packingItems[$bestPackingIdx];
                $unusedPackingIndexes = array_values(array_diff($unusedPackingIndexes, [$bestPackingIdx]));
            }

            $rowIssues = [];
            if ($matchedPkg === null) {
                $rowIssues[] = "Invoice line #{$invItem->line_number}: No corresponding packing list line item found.";
            } else {
                // Check quantity variance
                if (abs((float) $invItem->quantity - (float) $matchedPkg->quantity) > 0.001) {
                    $rowIssues[] = "Line #{$invItem->line_number}: Quantity differs (Invoice: ".((float) $invItem->quantity).' vs Packing: '.((float) $matchedPkg->quantity).').';
                }

                // Check HS Code
                if (! empty($invItem->hs_code) && ! empty($matchedPkg->hs_code) && $this->normalize($invItem->hs_code) !== $this->normalize($matchedPkg->hs_code)) {
                    $rowIssues[] = "Line #{$invItem->line_number}: HS code differs ({$invItem->hs_code} vs {$matchedPkg->hs_code}).";
                }

                // Check Unit
                if ($this->normalize($invItem->unit_of_measure) !== $this->normalize($matchedPkg->unit_of_measure)) {
                    $rowIssues[] = "Line #{$invItem->line_number}: Unit of measure differs ({$invItem->unit_of_measure} vs {$matchedPkg->unit_of_measure}).";
                }

                // Check missing packing weights/packages
                $missingFields = [];
                if (empty($matchedPkg->package_count)) {
                    $missingFields[] = 'packages';
                }
                if (empty($matchedPkg->gross_weight_kg)) {
                    $missingFields[] = 'gross weight';
                }
                if (empty($matchedPkg->net_weight_kg)) {
                    $missingFields[] = 'net weight';
                }
                if (! empty($missingFields)) {
                    $rowIssues[] = "Packing line for #{$invItem->line_number} is missing: ".implode(', ', $missingFields).'.';
                }
            }

            $pairs[] = [
                'invoice_item' => $invItem->toArray(),
                'packing_item' => $matchedPkg ? $matchedPkg->toArray() : null,
                'status' => empty($rowIssues) ? 'matched' : 'discrepancy',
                'issues' => $rowIssues,
            ];

            $issues = array_merge($issues, $rowIssues);
        }

        // Unused packing items (in packing list but not billed on invoice)
        foreach ($unusedPackingIndexes as $unmatchedIdx) {
            $unmatchedPkg = $packingItems[$unmatchedIdx];
            $msg = "Packing list line #{$unmatchedPkg->line_number} ({$unmatchedPkg->description_english}): No corresponding invoice line.";
            $issues[] = $msg;
            $pairs[] = [
                'invoice_item' => null,
                'packing_item' => $unmatchedPkg->toArray(),
                'status' => 'discrepancy',
                'issues' => [$msg],
            ];
        }

        // Header reconciliation
        if (! empty($invoiceMeta['consignee']) && ! empty($packingMeta['consignee'])) {
            if ($this->normalize($invoiceMeta['consignee']) !== $this->normalize($packingMeta['consignee'])) {
                $issues[] = "Consignee mismatch: Invoice states '{$invoiceMeta['consignee']}' but Packing List states '{$packingMeta['consignee']}'.";
            }
        }
        if (! empty($invoiceMeta['supplier']) && ! empty($packingMeta['supplier'])) {
            if ($this->normalize($invoiceMeta['supplier']) !== $this->normalize($packingMeta['supplier'])) {
                $issues[] = "Supplier mismatch: Invoice states '{$invoiceMeta['supplier']}' but Packing List states '{$packingMeta['supplier']}'.";
            }
        }
        if (! empty($packingMeta['contract_no']) && ! empty($invoiceMeta['invoice_no'])) {
            if ($this->normalize($packingMeta['contract_no']) !== $this->normalize($invoiceMeta['invoice_no'])) {
                $issues[] = "Reference mismatch: Packing contract '{$packingMeta['contract_no']}' does not match Invoice number '{$invoiceMeta['invoice_no']}'.";
            }
        }

        $invTotalQty = (float) $invoiceItems->sum('quantity');
        $pkgTotalQty = (float) $packingItems->sum('quantity');

        if (abs($invTotalQty - $pkgTotalQty) > 0.001) {
            $issues[] = "Total item quantity variance across documents: Invoice sum is {$invTotalQty} while Packing List sum is {$pkgTotalQty}.";
        }

        $matchedCount = count(array_filter($pairs, fn ($p) => $p['status'] === 'matched'));

        return [
            'status' => empty($issues) ? 'balanced' : 'has_discrepancies',
            'total_invoice_items' => count($invoiceItems),
            'total_packing_items' => count($packingItems),
            'matched_items_count' => $matchedCount,
            'discrepancy_count' => count($issues),
            'invoice_total_quantity' => $invTotalQty,
            'packing_total_quantity' => $pkgTotalQty,
            'invoice_total_gross_weight' => (float) $invoiceItems->sum('gross_weight_kg'),
            'packing_total_gross_weight' => (float) $packingItems->sum('gross_weight_kg'),
            'discrepancies' => $issues,
            'pairs' => $pairs,
        ];
    }

    private function calculatePairRank(TradeDocumentItem $inv, TradeDocumentItem $pkg): int
    {
        $zhMatch = ! empty($inv->description_original) && $this->normalize($inv->description_original) === $this->normalize($pkg->description_original);
        $engMatch = ! empty($inv->description_english) && $this->normalize($inv->description_english) === $this->normalize($pkg->description_english);
        $hsMatch = ! empty($inv->hs_code) && $this->normalize($inv->hs_code) === $this->normalize($pkg->hs_code);
        $qtyMatch = abs((float) $inv->quantity - (float) $pkg->quantity) < 0.001;
        $unitMatch = $this->normalize($inv->unit_of_measure) === $this->normalize($pkg->unit_of_measure);

        if (($zhMatch || $engMatch) && $hsMatch && $qtyMatch && $unitMatch) {
            return 5;
        }
        if (($zhMatch || $engMatch) && $hsMatch && $unitMatch) {
            return 4;
        }
        if (($zhMatch || $engMatch) && $qtyMatch && $unitMatch) {
            return 3;
        }
        if ($zhMatch || $engMatch) {
            return 2;
        }
        if ($hsMatch && $qtyMatch) {
            return 1;
        }

        return 0;
    }

    private function formatItemRow(array $row, int $lineNumber): array
    {
        $original = trim($row['description_original'] ?? '');
        $providedEng = trim($row['description_english'] ?? '');
        $english = $this->translate($original, $providedEng);

        $qty = (float) ($row['quantity'] ?? 1);
        $price = isset($row['unit_price']) ? (float) $row['unit_price'] : null;
        $total = isset($row['total_amount']) ? (float) $row['total_amount'] : ($price !== null ? round($qty * $price, 2) : null);

        return [
            'line_number' => $lineNumber,
            'item_code' => $row['item_code'] ?? null,
            'hs_code' => $row['hs_code'] ?? null,
            'description_original' => $original ?: null,
            'description_english' => $english ?: ($original ?: "Item #{$lineNumber}"),
            'quantity' => $qty,
            'unit_of_measure' => strtoupper(trim($row['unit_of_measure'] ?? 'PCS')),
            'unit_price' => $price,
            'total_amount' => $total,
            'package_count' => isset($row['package_count']) ? (int) $row['package_count'] : null,
            'package_type' => $row['package_type'] ?? null,
            'gross_weight_kg' => isset($row['gross_weight_kg']) ? (float) $row['gross_weight_kg'] : null,
            'net_weight_kg' => isset($row['net_weight_kg']) ? (float) $row['net_weight_kg'] : null,
            'volume_cbm' => isset($row['volume_cbm']) ? (float) $row['volume_cbm'] : null,
            'match_status' => $row['match_status'] ?? 'unmatched',
            'raw_metadata' => $row['raw_metadata'] ?? null,
        ];
    }
}
