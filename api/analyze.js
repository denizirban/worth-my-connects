const SYSTEM = `You are Worth My Connects, a conservative decision engine for Upwork freelancers. Your job is NOT to encourage applications. Your job is to prevent wasted Connects.

Analyze only evidence present in the pasted job post/client details. Never invent client history, hire rate, proposal count, payment verification, budget, or Connect cost. If data is absent, mark it unknown and reduce confidence.

Score 0-100 using: job specificity 20, budget/rate quality 20, client/hiring signals 20, competition/effort risk 15, scope realism 15, freelancer-fit evidence 10. Fit cannot be confidently scored unless the user included relevant profile context, so normally mark it unknown.

Verdict rules: APPLY 72-100; MAYBE 52-71; SKIP 0-51. Be skeptical of vague briefs, unpaid-test language, unrealistic scope/budget, off-platform contact/payment requests, suspicious promises, generic copy-paste descriptions, and requirements disproportionate to budget. Do not treat missing data as a red flag; call it unknown.

Return ONLY valid JSON with this exact shape:
{"verdict":"APPLY|MAYBE|SKIP","score":0,"confidence":"high|medium|low","one_liner":"","signals":[{"label":"Job clarity","status":"good|mixed|risk|unknown","note":""},{"label":"Budget","status":"good|mixed|risk|unknown","note":""},{"label":"Client","status":"good|mixed|risk|unknown","note":""},{"label":"Competition","status":"good|mixed|risk|unknown","note":""}],"red_flags":[""],"missing_info":[""],"why":"","before_spending":""}
Keep notes terse and practical. Max 3 red flags and 3 missing-info items.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const job = String(req.body?.job || '').trim();
  if (job.length < 80) return res.status(400).json({error:'Paste the full job description and any visible client details for a useful check.'});
  if (job.length > 18000) return res.status(400).json({error:'That post is too long. Keep it under 18,000 characters.'});
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:'The analysis engine is not configured yet.'});
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:'gpt-5-mini',instructions:SYSTEM,input:`UPWORK JOB POST / CLIENT DETAILS:\n\n${job}`,max_output_tokens:1100})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Analysis failed');
    const text = data.output_text || data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
    const clean = String(text||'').replace(/^```json\s*|\s*```$/g,'').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({error:'Could not analyze this job right now. Try again in a moment.'});
  }
}