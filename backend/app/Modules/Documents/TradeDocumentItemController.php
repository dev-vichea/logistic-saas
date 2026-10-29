<?php

namespace App\Modules\Documents;

use App\Http\Controllers\Controller;
use App\Modules\Organizations\OrganizationContext;
use Illuminate\Http\JsonResponse;

class TradeDocumentItemController extends Controller
{
    public function __construct(private DocumentActions $actions) {}

    public function update(DocumentItemUpdateRequest $request, int $organization, int $document, int $item): JsonResponse
    {
        $context = $request->attributes->get(OrganizationContext::class);
        $updatedItem = $this->actions->updateDocumentItem($context, $document, $item, $request->validated());

        return response()->json($updatedItem);
    }
}
