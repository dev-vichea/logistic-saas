<?php

return [
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'countries' => ['KH' => 'Cambodia', 'TH' => 'Thailand', 'VN' => 'Vietnam', 'LA' => 'Laos', 'MM' => 'Myanmar', 'MY' => 'Malaysia', 'SG' => 'Singapore', 'ID' => 'Indonesia', 'PH' => 'Philippines', 'BN' => 'Brunei', 'TL' => 'Timor-Leste'],
    'currencies' => ['USD', 'KHR', 'THB', 'VND', 'LAK', 'MMK', 'MYR', 'SGD', 'IDR', 'PHP', 'BND'],
    'activities' => ['road_transport' => 'Road transport', 'freight_forwarding' => 'Freight forwarding', 'warehousing' => 'Warehousing', 'customs_brokerage' => 'Customs brokerage', 'last_mile' => 'Last-mile delivery', 'ocean_freight' => 'Ocean freight', 'air_freight' => 'Air freight', 'multimodal' => 'Multimodal transport'],
];
