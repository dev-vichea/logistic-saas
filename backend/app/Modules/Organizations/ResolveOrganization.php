<?php

namespace App\Modules\Organizations;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $membership = Membership::with('organization')->where('organization_id', $request->route('organization'))->where('user_id', $request->user()->id)->firstOrFail();
        $request->attributes->set(OrganizationContext::class, new OrganizationContext($membership->organization, $membership));

        return $next($request);
    }
}
