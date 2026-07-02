"use strict";

const DEFAULT_BASE_URL = "https://cnapi.kksj.org/v1";
const DEFAULT_IMAGE_MODEL = "gpt-4o-image";
const DEFAULT_IMAGE_SIZE = "1024x1024";
const DEFAULT_TIMEOUT_MS = 90000;
const MAX_BODY_BYTES = 20000;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        const error = new Error("Request body too large");
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        const parseError = new Error("Invalid JSON body");
        parseError.statusCode = 400;
        reject(parseError);
      }
    });
    req.on("error", reject);
  });
}

function sanitize(text) {
  const blocked = ["去死", "废物", "垃圾", "傻逼", "操", "妈的", "恨死"];
  let next = String(text || "").trim().slice(0, 80);
  blocked.forEach((word) => {
    next = next.replaceAll(word, "不太妙");
  });
  return next;
}

function subjectFrom(text) {
  if (text.includes("作业")) return "作业";
  if (text.includes("小组")) return "小组";
  if (text.includes("老师")) return "练习";
  if (text.includes("考试")) return "考试";
  return "今日槽点";
}

function makeCopy(complaint, tone) {
  const clean = sanitize(complaint);
  const subjectZh = subjectFrom(clean);
  const lower = clean.toLowerCase();
  const subjectEn = lower.includes("homework") || clean.includes("作业")
    ? "homework"
    : lower.includes("group") || clean.includes("小组")
      ? "group work"
      : lower.includes("teacher") || lower.includes("exercise") || clean.includes("老师")
        ? "practice"
        : "today's complaint";
  const toneName = String(tone || "轻松玩笑").slice(0, 12);
  const toneEnMap = {
    "轻松玩笑": "Playful joke",
    "夸张漫画": "Big comic drama",
    "温柔吐槽": "Gentle complaint",
    "自嘲模式": "Laugh at myself"
  };
  const titleMap = {
    "轻松玩笑": `${subjectEn} mini drama`,
    "夸张漫画": `${subjectEn} monster appears`,
    "温柔吐槽": `${subjectEn} needs a warm pause`,
    "自嘲模式": `peace talks with ${subjectEn}`
  };
  const titleZhMap = {
    "轻松玩笑": `${subjectZh}小剧场开播`,
    "夸张漫画": `${subjectZh}怪兽突然出现`,
    "温柔吐槽": `${subjectZh}需要一杯温水`,
    "自嘲模式": `我和${subjectZh}的和平谈判`
  };
  const bubbleMap = {
    "轻松玩笑": `When ${subjectEn} showed up, my meme face opened for business.`,
    "夸张漫画": `${subjectEn} got so loud that the comic subtitles started shaking!`,
    "温柔吐槽": `${subjectEn} is making me wobble a little, but I can still say it kindly.`,
    "自嘲模式": `When I meet ${subjectEn}, my brain politely starts buffering.`
  };
  const bubbleZhMap = {
    "轻松玩笑": `${subjectZh}刚一出现，我的表情包就自动营业了。`,
    "夸张漫画": `${subjectZh}的音量太大，漫画字幕都被震出来了！`,
    "温柔吐槽": `我对${subjectZh}有一点点崩溃，但我可以好好说。`,
    "自嘲模式": `遇到${subjectZh}时，我的大脑正在礼貌地转圈。`
  };
  const replyMap = {
    "轻松玩笑": "Circle the most annoying part first, then give yourself a tiny reward.",
    "夸张漫画": "Turn the feeling into a monster, then handle one horn first.",
    "温柔吐槽": "The feeling is real. The expression can stay gentle.",
    "自嘲模式": "Laughing does not mean giving up. It is a restart button."
  };
  const replyZhMap = {
    "轻松玩笑": "先把最烦的部分圈出来，再给自己一个小奖励。",
    "夸张漫画": "把情绪画成怪兽，然后决定先处理它的一只角。",
    "温柔吐槽": "感受是真的，表达可以更柔软一点。",
    "自嘲模式": "笑一下不等于放弃，是给自己重新开始的按钮。"
  };
  const resolvedTone = titleMap[toneName] ? toneName : "轻松玩笑";

  return {
    raw: clean,
    title: titleMap[resolvedTone],
    titleZh: titleZhMap[resolvedTone],
    bubble: bubbleMap[resolvedTone],
    bubbleZh: bubbleZhMap[resolvedTone],
    reply: replyMap[resolvedTone],
    replyZh: replyZhMap[resolvedTone],
    tone: resolvedTone,
    toneEn: toneEnMap[resolvedTone],
    toneZh: resolvedTone
  };
}

function makeImagePrompt(copy) {
  const moodMap = {
    "轻松玩笑": "playful, sunny, friendly classroom humor",
    "夸张漫画": "dramatic, exaggerated, high energy comic action",
    "温柔吐槽": "gentle, warm, soft emotional comic scene",
    "自嘲模式": "cute self-deprecating humor, charming awkward protagonist"
  };
  const mood = moodMap[copy.tone] || moodMap["轻松玩笑"];
  return [
    "Create a polished two-panel comic illustration for a classroom AI product demo.",
    "Style: expressive modern children's comic, bold ink outlines, warm colors, energetic panel composition.",
    `Mood: ${mood}.`,
    `Scenario inspiration: a student complaint about "${copy.raw}".`,
    "Panel 1 should show the raw frustrated feeling as a funny harmless scene.",
    "Panel 2 should show the same feeling transformed into a kind, shareable comic moment.",
    "Panel 2 must contain exactly one large blank white speech bubble in the lower-left quadrant, taking about one third of the panel width.",
    "Do not draw any other speech bubbles, thought bubbles, captions, readable text, logos, or watermarks.",
    "Keep the lower-left speech bubble completely empty so Chinese text can be overlaid by the web page.",
    "No violence, no bullying, no real person likeness."
  ].join(" ");
}

function makeAbortController(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function defaultDownloadImageAsDataUrl(imageUrl, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const { controller, timer } = makeAbortController(timeoutMs);
  try {
    const response = await fetchImpl(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Image download failed with ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }
    const contentType = response.headers?.get?.("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } finally {
    clearTimeout(timer);
  }
}

async function generateComicPayload(input, options = {}) {
  const apiKey = options.apiKey || "";
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const imageModel = options.imageModel || DEFAULT_IMAGE_MODEL;
  const imageSize = options.imageSize || DEFAULT_IMAGE_SIZE;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl || fetch;
  const downloadImageAsDataUrl = options.downloadImageAsDataUrl || defaultDownloadImageAsDataUrl;
  const complaint = sanitize(input?.complaint);
  const tone = String(input?.tone || "轻松玩笑").slice(0, 12);

  if (!complaint) {
    const error = new Error("complaint is required");
    error.statusCode = 400;
    throw error;
  }
  if (!apiKey) {
    const error = new Error("KKSJ_API_KEY is missing");
    error.statusCode = 503;
    throw error;
  }

  const copy = makeCopy(complaint, tone);
  const imagePrompt = makeImagePrompt(copy);
  const { controller, timer } = makeAbortController(timeoutMs);

  try {
    const response = await fetchImpl(`${baseUrl}/images/generations`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: imagePrompt,
        n: 1,
        size: imageSize
      })
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (error) {
      const jsonError = new Error(`Image provider returned non-JSON response: ${raw.slice(0, 160)}`);
      jsonError.statusCode = 502;
      throw jsonError;
    }

    if (!response.ok) {
      const message = data.error?.message || data.message || raw.slice(0, 220) || "image request failed";
      const error = new Error(`Image request failed: ${message}`);
      error.statusCode = response.status || 502;
      throw error;
    }

    const item = data.data && data.data[0];
    if (!item) {
      const error = new Error("Image response did not include data[0]");
      error.statusCode = 502;
      throw error;
    }

    let imageDataUrl = "";
    if (item.b64_json) {
      imageDataUrl = `data:image/png;base64,${item.b64_json}`;
    } else if (item.url) {
      imageDataUrl = await downloadImageAsDataUrl(item.url, { fetchImpl, timeoutMs });
    } else {
      const error = new Error("Image response did not include b64_json or url");
      error.statusCode = 502;
      throw error;
    }

    return {
      ...copy,
      imageDataUrl,
      imageModel,
      source: "kksj-image"
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`Image request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function handleGenerateComic(req, res, options = {}) {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const payload = await generateComicPayload(body, {
      apiKey: options.apiKey || process.env.KKSJ_API_KEY,
      baseUrl: options.baseUrl || process.env.KKSJ_BASE_URL,
      imageModel: options.imageModel || process.env.KKSJ_IMAGE_MODEL,
      imageSize: options.imageSize || process.env.KKSJ_IMAGE_SIZE,
      timeoutMs: options.timeoutMs || Number(process.env.KKSJ_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
      fetchImpl: options.fetchImpl || fetch
    });
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Unknown error",
      source: "kksj-image"
    });
  }
}

module.exports = {
  generateComicPayload,
  handleGenerateComic,
  makeCopy,
  makeImagePrompt,
  sanitize
};
