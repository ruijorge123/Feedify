import api from "@/lib/api";
import { fbTrack } from "@/lib/metaPixel";

/**
 * Persist a copied prompt to History (manual copy-to-ChatGPT flow).
 * Best-effort: never throws, never blocks the copy UX.
 * Pass a stable `id` (from a useRef) so repeated copies upsert instead of duplicating.
 * Returns the saved id (reuse it as `id` on the next call for the same prompt).
 *
 * This is the single shared save point for Banner, Carousel, Marketplace, Food Menu,
 * Studio, and Reels (all via PromptSuccessCard) — so it's also the one place that can
 * reliably tell whether this is the user's first-ever generated prompt across every
 * one of those dashboards, via the `is_first_ever` flag the backend computes.
 * Feed Generator, Copywriting, and Talking Avatar do NOT go through this function
 * (separate dedicated endpoints) — see the Meta Pixel install report for why those
 * don't fire Meta Pixel's StartTrial today.
 */
export async function savePromptToHistory(payload) {
  try {
    const { data } = await api.post("/prompts/save", payload);
    if (data?.is_first_ever) fbTrack("StartTrial");
    return data?.id || null;
  } catch {
    return null;
  }
}

const SYSTEM_DIRECTIVES = {
  commercial_banner_generation:
    "You are an elite Commercial Art Director and Graphic Designer. Create a premium product promotional banner based on the exact specifications below. Ensure the provided product image(s) are seamlessly integrated.",
  instagram_feed_post_generation:
    "You are an elite Social Media Art Director. Create a stunning Instagram feed post based on the exact specifications below. The uploaded product photo must be the hero of the composition.",
  instagram_carousel_slide_generation:
    "You are an elite Social Media Art Director. Create one Instagram carousel slide based on the slide specification below. Attach the product photo before sending.",
  fnb_food_photography_generation:
    "You are an elite Food Photography Director. Create mouth-watering commercial food photography based on the exact specifications below.",
  marketplace_thumbnail_generation:
    "You are an elite E-commerce Art Director. Create a high-converting marketplace product thumbnail based on the exact specifications below.",
  commercial_product_photography:
    "You are an elite Commercial Photography Director specializing in product photography. Create ultra-realistic studio-quality commercial product photography based on the exact specifications below.",
};

const DEFAULT_DIRECTIVE =
  "You are an elite Commercial Art Director and Graphic Designer. Create a premium commercial visual based on the exact specifications below. Ensure the provided product image(s) are seamlessly integrated into the scene naturally.";

/**
 * Build a prompt for ONE carousel slide (use this, not buildPromptForChatGPT, for carousel).
 * Each slide must be sent to ChatGPT separately so it generates one image at a time.
 */
export function buildCarouselSlidePrompt(data, slideIndex) {
  const slides = data?.prompt_json?.slides || [];
  const meta   = data?.prompt_json?.carousel_meta || {};
  const slide  = slides[slideIndex];
  if (!slide) return "";

  const { natural_prompt: _np, ...slideRest } = slide;
  return JSON.stringify({
    ...slideRest,
    carousel_context: {
      brand:        meta.brand_name || "",
      topic:        meta.topic || "",
      template:     meta.template || "",
      this_slide:   slideIndex + 1,
      total_slides: slides.length,
      aspect_ratio: meta.aspect_ratio || "4:5",
      instruction:  `Generate ONLY this single slide image. Upload your product photo (and inspiration photo if any) before sending. ` +
                    `Maintain visual consistency with the other ${slides.length - 1} slides in this carousel series.`,
    },
  }, null, 2);
}

/**
 * Build the rich JSON prompt string to copy to ChatGPT.
 * NOTE: For carousel use buildCarouselSlidePrompt() instead — carousel must be generated slide-by-slide.
 * This function is still used for banner, food, marketplace, and studio pages.
 */
export function buildPromptForChatGPT(data) {
  // Carousel: always use buildCarouselSlidePrompt() per slide — do not merge
  if (data?.prompt_json?.slides) {
    return buildCarouselSlidePrompt(data, 0);
  }

  // Reels: no prompt_json, just natural_prompt text
  if (!data?.prompt_json && data?.natural_prompt) {
    return data.natural_prompt;
  }

  // All other pages: banner, food, marketplace, studio
  const raw = data?.prompt_json || {};
  const taskType = raw.task_type || "";
  const directive = SYSTEM_DIRECTIVES[taskType] || DEFAULT_DIRECTIVE;

  const { task_type: _tt, ...restRaw } = raw;
  const formatted = {
    task_type: taskType || "commercial_image_generation",
    system_directive: directive,
    instructions:
      "Generate an image based on the exact specifications below. " +
      "Attach your product photo (and inspiration/reference photo if available) to this message before sending.",
    model_parameters: {
      aspect_ratio: raw.model_parameters?.aspect_ratio || "4:5 (Portrait Feed)",
      quality: "high",
      photorealism: "ultra-realistic, 8k resolution",
    },
    ...restRaw,
  };

  return JSON.stringify(formatted, null, 2);
}

/**
 * Copy text to clipboard — tries modern API first, falls back to execCommand.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Opens ChatGPT in a new tab.
 */
export function openChatGPT() {
  window.open("https://chatgpt.com", "_blank", "noopener,noreferrer");
}

/**
 * Legacy: copy + open in one call. Still used for backward compat.
 */
export async function openInChatGPT(textOrData) {
  const text =
    typeof textOrData === "string" ? textOrData : buildPromptForChatGPT(textOrData);
  await copyToClipboard(text);
  openChatGPT();
  return { ok: true };
}
