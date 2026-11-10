// Public product reports can be synthetic-only; private diagnostics never pass through.
export function publicProductSummary(summary,{privateOnly=false}={}){
 return privateOnly?{status:'PRIVATE_REVIEW_ONLY',artisticAcceptance:'NOT_REVIEWED',note:'Commercial model diagnostics are restricted to the unpublished review bundle.'}:summary;
}
