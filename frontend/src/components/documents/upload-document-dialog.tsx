"use client";

import { useState } from "react";
import { Upload, Sparkles, FileText, Loader2, FileSpreadsheet } from "lucide-react";
import { useWorkspace } from "@/components/workspace";
import { api, errorMessage } from "@/lib/api";
import { documentsRoot, type DocumentCatalog } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UploadDocumentDialog({
  catalog,
  onUploaded,
}: {
  catalog?: DocumentCatalog;
  onUploaded: () => void;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState<string>("commercial_invoice");
  const [docNumber, setDocNumber] = useState<string>("");
  const [shipmentId, setShipmentId] = useState<string>("");
  const [language, setLanguage] = useState<string>("zh-CN,en");
  const [fileName, setFileName] = useState<string>("");
  const [rawContent, setRawContent] = useState<string>("");

  const sampleChineseInvoice = `INVOICE NO: 26TKYM164, DATE: 2026-10-15
CONSIGNEE: Xin Cai Fu Garments (Cambodia) Co., Ltd
SUPPLIER: Ningbo Garment Machinery Equipment Co., Ltd
ORIGIN: Ningbo / Shanghai Port, DESTINATION: Sihanoukville Port / Phnom Penh
H.S.Code,Description,English,Quantity,Unit,Unit Price,Total Amount
8452.29.00,工业缝纫机,Industrial Sewing Machine,10,SET,350.00,3500.00
7326.90.90,堆垛架,,20,PCS,85.00,1700.00
9607.11.00,金属拉链,,5000,METER,0.45,2250.00
8452.21.00,自动模板机,Automatic Template Sewing Machine,2,SET,1250.00,2500.00`;

  const samplePackingList = `CONTRACT NO: 26TKYM164, DATE: 2026-10-15
CONSIGNEE: Xin Cai Fu Garments (Cambodia) Co., Ltd
SUPPLIER: Ningbo Garment Machinery Equipment Co., Ltd
H.S.Code,Description,English,Quantity,Unit,Packages,Gross Weight,Net Weight,Volume
8452.29.00,工业缝纫机,Industrial Sewing Machine,10,SET,10,450.00,400.00,2.500
7326.90.90,堆垛架,,20,PCS,5,320.00,300.00,1.800
9607.11.00,金属拉链,,5000,METER,15,180.00,165.00,0.900
8452.21.00,自动模板机,Automatic Template Sewing Machine,2,SET,2,280.00,250.00,1.400`;

  const handleLoadSample = (sampleType: "invoice" | "packing") => {
    if (sampleType === "invoice") {
      setDocType("commercial_invoice");
      setDocNumber("26TKYM164");
      setFileName("清关---TK164拓卡-新彩福-柬埔寨资料.xls");
      setRawContent(sampleChineseInvoice);
    } else {
      setDocType("packing_list");
      setDocNumber("PL-26TKYM164");
      setFileName("Packing_List_26TKYM164.xlsx");
      setRawContent(samplePackingList);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        document_type: docType,
        document_number: docNumber.trim() || undefined,
        shipment_id: shipmentId ? parseInt(shipmentId, 10) : undefined,
        language,
        file_name: fileName.trim() || `${docType}.csv`,
        raw_content: rawContent.trim() || undefined,
      };

      await api.post(`${documentsRoot(organization.id)}`, payload);

      setOpen(false);
      setDocNumber("");
      setFileName("");
      setRawContent("");
      setShipmentId("");
      onUploaded();
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-blue-950 hover:bg-blue-900 text-white shadow-2xs flex items-center gap-1.5">
          <Upload className="h-4 w-4" />
          <span>Upload Trade Document</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" size="xl" className="p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">
                <FileText className="size-4 text-indigo-900" />
              </div>
              <div>
                <SheetTitle>Intake & AI Parse Trade Document</SheetTitle>
                <SheetDescription>
                  Upload commercial invoices, packing lists, or BLs. Automatically extracts line items, HS codes, and normalizes bilingual descriptions.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                {error}
              </div>
            )}

            {/* Quick Sample Presets */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-3.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Quick load sample:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadSample("invoice")}
                className="text-xs h-7 border-blue-200 text-blue-900 bg-white hover:bg-blue-50"
              >
                <Sparkles className="h-3 w-3 mr-1 text-blue-700" />
                Supplier Invoice (26TKYM164)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadSample("packing")}
                className="text-xs h-7 border-blue-200 text-blue-900 bg-white hover:bg-blue-50"
              >
                <Sparkles className="h-3 w-3 mr-1 text-blue-700" />
                Packing List (PL-26TKYM164)
              </Button>
            </div>

            {/* Document Metadata */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileSpreadsheet size={15} className="text-blue-900" />
                <span>Document Classification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="docType" className="text-xs font-semibold text-slate-700">Document Type *</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger id="docType" className="mt-1 bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial_invoice">Commercial Invoice (CI)</SelectItem>
                      <SelectItem value="packing_list">Packing List (PL)</SelectItem>
                      <SelectItem value="bill_of_lading">Bill of Lading (B/L)</SelectItem>
                      <SelectItem value="customs_declaration">Customs Declaration (SAD)</SelectItem>
                      <SelectItem value="certificate_of_origin">Certificate of Origin (CO)</SelectItem>
                      <SelectItem value="delivery_order">Delivery Order (DO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="docNumber" className="text-xs font-semibold text-slate-700">Document Reference #</Label>
                  <Input
                    id="docNumber"
                    placeholder="e.g. 26TKYM164 or PL-8812"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="mt-1 bg-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipmentId" className="text-xs font-semibold text-slate-700">Attach to Shipment (Optional)</Label>
                  <Select value={shipmentId} onValueChange={setShipmentId}>
                    <SelectTrigger id="shipmentId" className="mt-1 bg-white">
                      <SelectValue placeholder="Select shipment..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None / Standalone Vault --</SelectItem>
                      {catalog?.shipments?.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.shipment_number} ({s.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language" className="text-xs font-semibold text-slate-700">Document Language / OCR Model</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language" className="mt-1 bg-white">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN,en">Bilingual Chinese & English (中英双语)</SelectItem>
                      <SelectItem value="en">English (US/UK/International)</SelectItem>
                      <SelectItem value="km,en">Bilingual Khmer & English (ខ្មែរ-អង់គ្លេស)</SelectItem>
                      <SelectItem value="vi,en">Bilingual Vietnamese & English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="fileName" className="text-xs font-semibold text-slate-700">Original File Name</Label>
                <Input
                  id="fileName"
                  placeholder="e.g. 清关---TK164拓卡-新彩福-柬埔寨资料.xls"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="mt-1 bg-white text-sm"
                />
              </div>
            </div>

            {/* Raw Extracted / Pasted Content */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rawContent" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Raw Structured Data / SpreadSheet Text
                </Label>
                <span className="text-[11px] text-slate-400">CSV, TSV, or Excel Table Data</span>
              </div>
              <Textarea
                id="rawContent"
                rows={9}
                placeholder="Paste CSV, TSV, or spreadsheet row data here..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                className="mt-1 font-mono text-xs bg-white"
              />
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold shadow-2xs">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Intake & AI Parse"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
