// Only allowlisted CI identifiers enter public metadata, never environment dumps.
export function probeProvenance(env = process.env) {
  return {
    sourceCommit: /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') ? env.GITHUB_SHA : null,
    workflowRunId: /^\d+$/.test(env.GITHUB_RUN_ID ?? '') ? env.GITHUB_RUN_ID : null,
    workflowRunAttempt: /^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? '') ? env.GITHUB_RUN_ATTEMPT : null,
  };
}

export function requireProbeConversion(result, expectedPreset) {
  if (!result || result.failed || result.conversionPreset !== expectedPreset ||
      !Number.isSafeInteger(result.triangles) || result.triangles <= 0) {
    // Do not interpolate renderer errors or source paths into public logs.
    throw new Error('Missing, stale or invalid conversion diagnostic');
  }
  return result;
}
