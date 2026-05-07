import { env } from "@halal/config";

export interface AiVerificationResult {
  verdict: "APPROVED" | "FLAGGED" | "REJECTED";
  reason: string;
  score: number;
  checkedAt: Date;
}

// ── Real OpenAI GPT-4o Vision verification ────────────────────────────────────
export async function runAiVerification(input: {
  certNumber: string;
  certType: string;
  authority: string;
  issueDate: Date;
  expiryDate: Date;
  imageDataUrl: string | null;
  healthImageDataUrl?: string | null;
}): Promise<AiVerificationResult> {
  const checkedAt = new Date();

  if (!env.OPENAI_API_KEY) {
    return runRuleBasedFallback(input, checkedAt);
  }

  const textPrompt = `You are a halal certificate verification expert for the Kuwait Public Authority for Food and Nutrition (PAFN).

You are given a halal certificate image uploaded by a manufacturer. Analyze the actual certificate document and verify its authenticity.

Metadata provided by the manufacturer:
- Certificate Number: ${input.certNumber}
- Certificate Type: ${input.certType}
- Issuing Authority: ${input.authority}
- Issue Date: ${input.issueDate.toLocaleDateString("en-GB")}
- Expiry Date: ${input.expiryDate.toLocaleDateString("en-GB")}

Check the certificate image and verify:
1. Does it look like a real, official halal certificate document?
2. Does the certificate number on the document match: ${input.certNumber}?
3. Does the issuing authority on the document match: ${input.authority}?
4. Are the dates on the document consistent with what was entered?
5. Does it have a halal logo, official stamp, or seal?
6. Is it professionally formatted (not a screenshot, not handwritten, not edited)?
7. Is the certificate expired?
8. Are there any signs of tampering or forgery?

Respond ONLY with a valid JSON object, nothing else:
{
  "verdict": "APPROVED" or "FLAGGED" or "REJECTED",
  "score": <0-100>,
  "reason": "<one paragraph with your findings>"
}

Rules: APPROVED (70-100) = genuine and valid. FLAGGED (40-69) = minor issues, needs human review. REJECTED (0-39) = expired, fake, mismatch, or unacceptable.`;

  const contentParts: object[] = [{ type: "text", text: textPrompt }];

  if (input.imageDataUrl) {
    const isPdf = input.imageDataUrl.startsWith("data:application/pdf");
    if (!isPdf) {
      contentParts.push({
        type: "image_url",
        image_url: { url: input.imageDataUrl, detail: "high" }
      });
    } else {
      contentParts.push({
        type: "text",
        text: "Note: The certificate was uploaded as a PDF. Visual inspection is not possible — flag for manual review."
      });
    }
  } else {
    contentParts.push({
      type: "text",
      text: "Note: No certificate image available. Base assessment on metadata only."
    });
  }

  if (input.healthImageDataUrl && !input.healthImageDataUrl.startsWith("data:application/pdf")) {
    contentParts.push({ type: "text", text: "Health/food safety certificate also uploaded:" });
    contentParts.push({
      type: "image_url",
      image_url: { url: input.healthImageDataUrl, detail: "high" }
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 500,
        messages: [{ role: "user", content: contentParts }]
      })
    });

    if (!response.ok) {
      console.error("[ai] OpenAI API error:", response.status, await response.text());
      return runRuleBasedFallback(input, checkedAt);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[ai] GPT response not JSON:", content);
      return runRuleBasedFallback(input, checkedAt);
    }

    const parsed = JSON.parse(jsonMatch[0]) as { verdict: string; score: number; reason: string };
    const verdict = (["APPROVED", "FLAGGED", "REJECTED"].includes(parsed.verdict?.toUpperCase())
      ? parsed.verdict.toUpperCase()
      : "FLAGGED") as AiVerificationResult["verdict"];
    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 50)));
    const reason = String(parsed.reason || "AI verification completed.").slice(0, 1000);

    console.log(`[ai] GPT-4o verdict for ${input.certNumber}: ${verdict} (${score}/100)`);
    return { verdict, score, reason, checkedAt };

  } catch (err) {
    console.error("[ai] OpenAI call failed:", err);
    return runRuleBasedFallback(input, checkedAt);
  }
}

// ── Rule-based fallback ───────────────────────────────────────────────────────
function runRuleBasedFallback(input: {
  certNumber: string; certType: string; authority: string;
  issueDate: Date; expiryDate: Date; imageDataUrl?: string | null;
}, checkedAt: Date): AiVerificationResult {
  const now = new Date();
  const reasons: string[] = [];
  const flags: string[] = [];
  const rejects: string[] = [];
  let score = 0;

  if (input.expiryDate < now) {
    rejects.push(`Certificate expired on ${input.expiryDate.toLocaleDateString()}.`);
  } else { score += 20; reasons.push("Certificate is not expired."); }

  if (input.issueDate > input.expiryDate) {
    rejects.push("Issue date is after expiry date.");
  } else if (input.issueDate > now) {
    rejects.push("Issue date is in the future.");
  } else { score += 10; reasons.push("Certificate dates are valid."); }

  if (!input.certNumber || input.certNumber.trim().length < 3) {
    rejects.push("Certificate number is missing or too short.");
  } else { score += 15; reasons.push("Certificate number is present."); }

  const ext = (input.imageDataUrl ?? "").toLowerCase();
  if (ext.startsWith("data:image/") || ext.startsWith("data:application/pdf")) {
    score += 10; reasons.push("Document format is accepted.");
  } else { rejects.push("Document format is not accepted. Please upload PDF, PNG, or JPG."); }

  if (!input.authority || input.authority.trim().length < 2) {
    flags.push("Issuing authority name is missing.");
  } else { score += 15; reasons.push(`Issuing authority: ${input.authority}.`); }

  if (input.certType?.toUpperCase().includes("HALAL")) {
    score += 30; reasons.push("Certificate is classified as Halal.");
  } else if (input.certType?.toUpperCase().includes("FOOD") || input.certType?.toUpperCase().includes("HEALTH")) {
    score += 20; reasons.push("Certificate is a Food Safety / Health certificate.");
  } else { flags.push("Certificate type could not be clearly classified."); score += 10; }

  let verdict: AiVerificationResult["verdict"];
  let finalReason: string;

  if (rejects.length > 0) {
    verdict = "REJECTED"; finalReason = rejects.join(" "); score = Math.min(score, 30);
  } else if (flags.length > 0) {
    verdict = "FLAGGED"; finalReason = flags.join(" ") + " Requires manual review."; score = Math.min(score, 65);
  } else {
    verdict = "APPROVED"; finalReason = reasons.join(" ") + " All checks passed."; score = Math.min(score, 100);
  }

  return { verdict, score, reason: finalReason, checkedAt };
}
