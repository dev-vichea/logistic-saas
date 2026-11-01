<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Organizations\OrganizationActions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecordWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_record_activity_and_documents_are_scoped_and_previewable(): void
    {
        Storage::fake('local');
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        $owner = User::factory()->create();
        $organization = app(OrganizationActions::class)->create($owner, [
            'name' => 'HQ', 'country_code' => 'CN', 'currency' => 'USD',
            'timezone' => 'Asia/Shanghai', 'activities' => ['freight_forwarding'],
        ]);
        $supplier = $organization->partners()->create(['name' => 'Wealdone', 'roles' => ['supplier'], 'country_code' => 'CN']);
        $this->actingAs($owner);
        $root = "/api/v1/organizations/{$organization->id}";
        $request = $this->postJson("$root/material-requests", [
            'title' => 'Fabric', 'items' => [['description' => 'Cotton', 'quantity' => 10, 'unit' => 'METER']],
        ])->assertCreated()->json('data');
        $requestUrl = "$root/material-requests/{$request['id']}";
        $this->postJson("$requestUrl/submit")->assertOk();
        $order = $this->postJson("$root/purchase-orders", [
            'material_request_id' => $request['id'], 'supplier_partner_id' => $supplier->id,
            'items' => [['material_request_item_id' => $request['items'][0]['id'], 'quantity' => 10, 'unit_price' => 2]],
        ])->assertCreated()->json('data');
        $orderUrl = "$root/purchase-orders/{$order['id']}";

        $this->getJson("$requestUrl/activity")->assertOk()
            ->assertJsonPath('data.0.action', 'purchase_order.created')
            ->assertJsonPath('data.0.actor_name', $owner->name);
        $this->getJson("$orderUrl/activity")->assertOk()->assertJsonPath('data.0.action', 'purchase_order.created');
        $this->postJson("$orderUrl/issue")->assertOk();
        $this->getJson("$orderUrl/activity")->assertOk()->assertJsonPath('data.0.action', 'purchase_order.issued');
        $document = $this->post("$requestUrl/documents", ['file' => UploadedFile::fake()->create('fabric.pdf', 1, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.file_name', 'fabric.pdf')->json('data');
        $this->assertArrayNotHasKey('file_path', $document);
        $this->getJson("$requestUrl/documents")->assertOk()->assertJsonCount(1, 'data');
        $this->get("$requestUrl/documents/{$document['id']}/content")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->get("$requestUrl/documents/{$document['id']}/content?download=1")->assertOk();
        $this->getJson("$orderUrl/documents/{$document['id']}/content")->assertNotFound();

        $foreignUser = User::factory()->create();
        $foreignOrganization = app(OrganizationActions::class)->create($foreignUser, [
            'name' => 'Other', 'country_code' => 'KH', 'currency' => 'USD',
            'timezone' => 'Asia/Phnom_Penh', 'activities' => ['freight_forwarding'],
        ]);
        $this->actingAs($foreignUser);
        $this->getJson("$requestUrl/activity")->assertNotFound();
        $this->getJson("$orderUrl/documents")->assertNotFound();
        $this->getJson("$requestUrl/documents/{$document['id']}/content")->assertNotFound();
        $this->deleteJson("$requestUrl/documents/{$document['id']}")->assertNotFound();
        $this->post("$requestUrl/documents", ['file' => UploadedFile::fake()->create('foreign.pdf', 1, 'application/pdf')], ['Accept' => 'application/json'])->assertNotFound();
        $this->getJson("/api/v1/organizations/{$foreignOrganization->id}/material-requests/{$request['id']}/documents")->assertNotFound();

        $this->actingAs($owner);
        $orderDocument = $this->post("$orderUrl/documents", ['file' => UploadedFile::fake()->create('order.pdf', 1, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertCreated()->json('data');
        $this->getJson("$orderUrl/documents")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("$requestUrl/documents/{$orderDocument['id']}/content")->assertNotFound();
        $this->deleteJson("$requestUrl/documents/{$document['id']}")->assertOk();
        $this->getJson("$requestUrl/documents")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("$requestUrl/activity")->assertOk()->assertJsonPath('data.0.action', 'record_document.deleted');
    }
}
