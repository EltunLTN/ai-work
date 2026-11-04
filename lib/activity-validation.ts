export function activityPath(path:string){return path.replace(/^\/kairo\/duel\/join\/[a-zA-Z0-9_-]+$/, "/kairo/duel/join/invite");}
export const EVENT_KINDS = new Set(["page.view","auth.signed_in","auth.signed_out","ui.click","form.submitted","exam.configured","exam.started","exam.answer_selected","exam.completed","history.exported"]);
const keys = new Set(["subject","subjects","grade","count","question","control","destination"]);
export function sanitizeActivity(input: unknown) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 25) throw new Error("Invalid events");
  return input.map(raw => {
    if (!raw || typeof raw !== "object" || !EVENT_KINDS.has(raw.kind) || typeof raw.path !== "string" || !/^\/[a-z0-9/_-]*$/i.test(raw.path) || raw.path.length > 120) throw new Error("Invalid event");
    const details: Record<string,string|number> = {};
    for (const [key,value] of Object.entries(raw.details ?? {})) if (keys.has(key) && (typeof value === "string" || typeof value === "number" && Number.isFinite(value))) details[key] = typeof value === "string" ? (key === "destination" ? activityPath(value) : value).slice(0,120) : Math.max(0,Math.min(100,value));
    return { kind: raw.kind as string, path: activityPath(raw.path as string), details };
  });
}
