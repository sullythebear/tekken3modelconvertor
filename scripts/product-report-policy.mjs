// Public product reports can be synthetic-only; private diagnostics never pass through.
export function publicProductSummary(summary,{privateOnly=false}={}){
 return privateOnly?{status:'PRIVATE_REVIEW_ONLY',artisticAcceptance:'NOT_REVIEWED',note:'Commercial model diagnostics are restricted to the unpublished review bundle.'}:summary;
}
export function publicRegressionStatus(report){return{status:report.status,privateTemporaryFilesRemoved:!!report.privateTemporaryFilesRemoved,failedPhase:report.phases?.find(p=>p.status==='FAIL')?.name??null,scope:'Detailed model diagnostics remain in the restricted review.'};}
